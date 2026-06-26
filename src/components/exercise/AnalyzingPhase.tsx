import { useEffect, useRef, useState } from "react";
import { Brain, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSubmitRecording, type SubmitRecordingPayload } from "@/hooks/exercise/useSubmitRecording";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Props {
  /** When provided together with `blob`, runs real upload + analyze flow. */
  submitPayload?: SubmitRecordingPayload;
  blob?: Blob | null;
  /** Called with the created recording id (or null on mock/fallback). */
  onComplete?: (recordingId: string | null) => void;
  /** Mock duration when no payload/blob given. */
  durationMs?: number;
}

const STEPS = [
  "Upload nagrania…",
  "Transkrypcja (Whisper)…",
  "Analiza tempa i pauz…",
  "Wykrywanie słów-wypełniaczy…",
  "Składanie raportu mentora…",
];

export default function AnalyzingPhase({ submitPayload, blob, onComplete, durationMs = 4000 }: Props) {
  const { user } = useAuth();
  const { submit, error: submitError } = useSubmitRecording();
  const [step, setStep] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const realFlow = !!(submitPayload && blob);

  // Cycle step labels for visual feedback regardless of real/mock.
  useEffect(() => {
    const tick = realFlow ? 2500 : durationMs / STEPS.length;
    const intId = setInterval(() => {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }, tick);
    return () => clearInterval(intId);
  }, [realFlow, durationMs]);

  // Mock path: just call onComplete after durationMs.
  useEffect(() => {
    if (realFlow) return;
    const t = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.(null);
      }
    }, durationMs);
    return () => clearTimeout(t);
  }, [realFlow, durationMs, onComplete]);

  // Real path: upload + invoke + subscribe.
  useEffect(() => {
    if (!realFlow || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const result = await submit(blob!, submitPayload!);
      if (!result) {
        setFailed("Analiza nie ruszyła. Spróbuj ponownie.");
        return;
      }
      setRecordingId(result.recordingId);
    })();
  }, [realFlow, blob, submitPayload, submit]);

  // Realtime: subscribe once we know the recording id + user.
  useEffect(() => {
    if (!recordingId || !user) return;

    const channel = supabase
      .channel(`recording:${recordingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "recordings",
          filter: `id=eq.${recordingId}`,
        },
        (payload) => {
          const next = payload.new as { status?: string };
          if (next.status === "complete" && !completedRef.current) {
            completedRef.current = true;
            onComplete?.(recordingId);
          } else if (next.status === "failed" && !completedRef.current) {
            completedRef.current = true;
            setFailed("Analiza nie powiodła się.");
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Safety poll every 5s in case realtime drops.
    const pollId = setInterval(async () => {
      if (completedRef.current) return;
      const { data } = await supabase
        .from("recordings")
        .select("status")
        .eq("id", recordingId)
        .single();
      const status = (data as { status?: string } | null)?.status;
      if (status === "complete" && !completedRef.current) {
        completedRef.current = true;
        onComplete?.(recordingId);
      } else if (status === "failed" && !completedRef.current) {
        completedRef.current = true;
        setFailed("Analiza nie powiodła się.");
      }
    }, 5000);

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [recordingId, user, onComplete]);

  if (failed || submitError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-400" />
        <h2 className="font-display text-xl font-semibold">Coś poszło nie tak</h2>
        <p className="max-w-md text-sm text-muted-foreground">{failed ?? submitError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-surface ring-1 ring-primary/30 shadow-elegant">
          <Brain className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          AI analizuje Twoje nagranie
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {realFlow ? "Pracuję nad tym…" : "Liczę liczby…"}
        </h2>
      </div>

      <ul className="space-y-2 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 transition-opacity ${
              i <= step ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                i < step ? "bg-emerald-400" : i === step ? "animate-pulse bg-primary" : "bg-muted"
              }`}
            />
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
