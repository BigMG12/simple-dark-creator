import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { recordingSession } from "@/hooks/use-recording-session";
import {
  analysisTimeoutInfo,
  backendFailureInfo,
  classifyInvokeError,
  detectMissingColumn,
  missingRecordingInfo,
  schemaMismatchInfo,
  startupTimeoutInfo,
  type AnalysisErrorInfo,
} from "@/lib/analysisErrors";
import AnalysisErrorScreen from "@/components/analyzing/AnalysisErrorScreen";

const MESSAGES = [
  "Transkrypcja twojego głosu...",
  "Pomiar tempa mowy...",
  "Wykrywanie słów wypełniaczy...",
  "Porównywanie z najlepszymi...",
  "Generowanie raportu...",
];

// Hard cap before we declare the analysis stuck. Whisper + GPT typically
// finish well under 90s; 3 minutes leaves comfortable headroom.
const ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;
// If the recording never moves out of `uploaded`, the edge function never
// started — surface that as a distinct, actionable error early.
const STARTUP_TIMEOUT_MS = 20 * 1000;
const ANALYZE_FUNCTION_NAME = "analyze-recording";

export default function Analyzing() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [errorInfo, setErrorInfo] = useState<AnalysisErrorInfo | null>(null);
  const errorInfoRef = useRef<AnalysisErrorInfo | null>(null);

  useEffect(() => {
    const recordingId = sessionStorage.getItem("bs:recording_id");

    if (!recordingId) {
      const info = missingRecordingInfo();
      errorInfoRef.current = info;
      setErrorInfo(info);
      return;
    }

    // Cycle through messages
    const cycle = window.setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 2000);

    // Kick off the background pipeline. The function returns 202 immediately
    // and processing continues server-side — but if the *invoke itself* fails
    // (network/CORS/404/500/auth) we surface the precise reason right away
    // instead of waiting for the watchdog to fire a generic message.
    let invokeFailed = false;
    let invokeAccepted = false;

    const finishSuccess = () => {
      recordingSession.clear();
      sessionStorage.removeItem("bs:recording_id");
      navigate(`/results/live/${recordingId}`, { replace: true });
    };

    const finishFailure = (info: AnalysisErrorInfo) => {
      if (errorInfoRef.current) return;
      errorInfoRef.current = info;
      setErrorInfo(info);
    };

    supabase.functions
      .invoke(ANALYZE_FUNCTION_NAME, { body: { recording_id: recordingId } })
      .then(({ data, error: fnError }) => {
        if (fnError) {
          invokeFailed = true;
          console.error("[Analyzing] invoke error:", fnError);
          finishFailure(classifyInvokeError(fnError, recordingId));
          return;
        }

        invokeAccepted = true;
        const invokeData = data as { runtime_version?: unknown } | null;
        const runtimeVersion = typeof invokeData?.runtime_version === "string"
          ? invokeData.runtime_version
          : "missing-runtime-version";
        sessionStorage.setItem("bs:analysis_runtime_version", runtimeVersion);

        // Missing runtime_version only proves the deployed bundle is old; after
        // the database shim, that old bundle can still finish successfully.
        // Do not block the user here — let realtime/polling report success or
        // the actual backend failure if it really fails.
        if (runtimeVersion === "missing-runtime-version") {
          console.warn("[Analyzing] backend accepted without runtime_version:", data);
        }
      })
      .catch((err) => {
        invokeFailed = true;
        console.error("[Analyzing] invoke threw:", err);
        finishFailure(classifyInvokeError(err, recordingId));
      });

    // Subscribe to realtime updates on analyses table (success path).
    const analysesChannel = supabase
      .channel(`analysis:${recordingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analyses",
          filter: `recording_id=eq.${recordingId}`,
        },
        () => finishSuccess(),
      )
      .subscribe();

    // Subscribe to recordings.status flipping to 'failed' (failure path).
    const recordingsChannel = supabase
      .channel(`recording-status:${recordingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "recordings",
          filter: `id=eq.${recordingId}`,
        },
        (payload) => {
          const next = payload.new as { status?: string; error_message?: string };
          if (next.status === "failed" && invokeAccepted) {
            finishFailure(backendFailureInfo(next.error_message, recordingId));
          }
        },
      )
      .subscribe();

    // Polling fallback - check every 3s if analysis is complete
    const pollInterval = window.setInterval(async () => {
      // Stop polling once we've already shown an error.
      if (errorInfoRef.current) return;
      const { data: analysis } = await supabase
        .from("analyses")
        .select("id")
        .eq("recording_id", recordingId)
        .maybeSingle();

      if (analysis) {
        finishSuccess();
        return;
      }

      // Also poll recordings.status for failure (in case realtime was missed).
      const { data: rec, error: recErr } = await supabase
        .from("recordings")
        .select("status, error_message")
        .eq("id", recordingId)
        .maybeSingle();

      // If the column itself is missing, the schema is out of sync with the
      // edge function. Surface that as a precise, actionable error and stop
      // polling — no point in retrying every 3s.
      const missingCol = detectMissingColumn(recErr);
      if (missingCol) {
        finishFailure(schemaMismatchInfo(missingCol, recordingId));
        return;
      }

      if (rec?.status === "failed" && invokeAccepted) {
        finishFailure(
          backendFailureInfo(
            (rec as { error_message?: string }).error_message,
            recordingId,
          ),
        );
      }
    }, 3000);

    // Startup watchdog: if the recording is still 'uploaded' after a short
    // window, the edge function never picked it up (most likely deploy/CORS
    // issue). Show a precise error instead of waiting 3 minutes.
    const startupWatchdog = window.setTimeout(async () => {
      // If invoke already produced a precise error, that takes priority.
      if (invokeFailed) return;
      const { data: rec } = await supabase
        .from("recordings")
        .select("status")
        .eq("id", recordingId)
        .maybeSingle();
      if (rec?.status === "uploaded") {
        finishFailure(startupTimeoutInfo(recordingId));
      }
    }, STARTUP_TIMEOUT_MS);

    // Hard watchdog: even if processing started, cap total wait time.
    const watchdog = window.setTimeout(() => {
      finishFailure(analysisTimeoutInfo(recordingId));
    }, ANALYSIS_TIMEOUT_MS);

    return () => {
      window.clearInterval(cycle);
      window.clearInterval(pollInterval);
      window.clearTimeout(startupWatchdog);
      window.clearTimeout(watchdog);
      supabase.removeChannel(analysesChannel);
      supabase.removeChannel(recordingsChannel);
    };
  }, [navigate]);

  if (errorInfo) {
    const recordingId = sessionStorage.getItem("bs:recording_id");
    return (
      <AnalysisErrorScreen
        info={errorInfo}
        onRetry={() => {
          // If we still have a recordingId in session, re-trigger the same
          // analysis (re-invokes the edge function with retry semantics —
          // status is reset to "analyzing" by the handler). Otherwise go
          // back to the recording flow.
          if (recordingId) {
            window.location.reload();
          } else {
            navigate("/record");
          }
        }}
        onBack={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden flex items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 text-center">
        <div className="relative mx-auto mb-10 h-44 w-44">
          <div className="absolute inset-0 rounded-full border-4 border-border" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderTopColor: "hsl(var(--primary))",
              borderRightColor: "hsl(var(--primary-glow))",
              animationDuration: "1.4s",
            }}
          />
          <div className="absolute inset-4 rounded-full bg-gradient-primary opacity-20 blur-xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-gradient-primary shadow-glow animate-pulse" />
          </div>
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Analizowanie
        </div>
        <div className="font-display text-2xl md:text-3xl text-foreground min-h-[2.5rem] transition-opacity">
          {MESSAGES[idx]}
        </div>
      </div>
    </div>
  );
}
