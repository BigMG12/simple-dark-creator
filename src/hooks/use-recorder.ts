/**
 * Recording flow hooks and utilities for BIG SPEAKING.
 *
 * Requires (not yet in package.json – install when wiring up Supabase):
 *   npm i @supabase/supabase-js
 *
 * @tanstack/react-query v5 is already installed.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutateFunction,
} from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Returned by useRecorder. */
export interface RecorderControls {
  /** Request mic access and begin recording. Resolves once MediaRecorder starts. */
  startRecording: () => Promise<void>;
  /** Stop and return the recorded Blob. Rejects if not recording. */
  stopRecording: () => Promise<Blob>;
  /** Abort recording without returning a Blob. Safe to call at any time. */
  cancelRecording: () => void;
  isRecording: boolean;
  /** Whole seconds elapsed, sampled every 100 ms for smooth UI countdown. */
  elapsedSeconds: number;
  /** RMS audio level 0–1 from Web Audio AnalyserNode. */
  audioLevel: number;
  error: string | null;
}

/** Options accepted by uploadRecording. */
export interface UploadOptions {
  /** Called with 0 (start) and 100 (complete). Supabase v2 does not stream progress. */
  onProgress?: (percent: number) => void;
}

/** Shape of a row from the `analyses` table. Extend to match your schema. */
export interface AnalysisResult {
  id: string;
  recording_id: string;
  score: number;
  transcript: string;
  filler_words: Record<string, number>;
  pace_wpm: number;
  created_at: string;
}

/** Returned by useAnalyzeRecording. */
export interface UseAnalyzeRecordingResult {
  /** Fire the edge function to start analysis. */
  analyze: UseMutateFunction<void, Error, void, unknown>;
  isLoading: boolean;
  analysis: AnalysisResult | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// useRecorder
// ---------------------------------------------------------------------------

/**
 * Manages the full recording lifecycle: mic permission, MediaRecorder (webm/opus),
 * Web Audio level metering, elapsed time, and auto-stop at maxDurationSeconds.
 *
 * All streams, AudioContext, animation frames, and timers are cleaned up on unmount.
 *
 * @param maxDurationSeconds - Hard stop after this many seconds.
 */
export function useRecorder(maxDurationSeconds: number): RecorderControls {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef    = useRef<MediaStream | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const rafRef       = useRef<number | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef   = useRef(0);

  // Promise handles so stopRecording() can resolve from the onstop callback.
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null);
  const rejectStopRef  = useRef<((reason: unknown) => void) | null>(null);

  /** Release all OS / Web Audio resources without touching React state. */
  const teardown = useCallback(() => {
    if (rafRef.current !== null)      cancelAnimationFrame(rafRef.current);
    if (timerRef.current !== null)    clearInterval(timerRef.current);
    if (autoStopRef.current !== null) clearTimeout(autoStopRef.current);

    try { analyserRef.current?.disconnect(); } catch { /* ignore */ }
    try { audioCtxRef.current?.close();     } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());

    rafRef.current      = null;
    timerRef.current    = null;
    autoStopRef.current = null;
    streamRef.current   = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
  }, []);

  // Guarantee cleanup on unmount regardless of recording state.
  useEffect(() => {
    return () => {
      teardown();
      if (recorderRef.current?.state !== "inactive") {
        try { recorderRef.current?.stop(); } catch { /* ignore */ }
      }
    };
  }, [teardown]);

  const startRecording = useCallback(async (): Promise<void> => {
    setError(null);
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setAudioLevel(0);
    chunksRef.current = [];

    // ── 1. Mic permission ────────────────────────────────────────────────
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      const name = (err as DOMException).name;
      const msg =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was denied."
          : name === "NotFoundError"
          ? "No microphone found on this device."
          : "Could not access microphone.";
      setError(msg);
      return;
    }
    streamRef.current = stream;

    // ── 2. Web Audio – RMS level ─────────────────────────────────────────
    const AC =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AC) {
      const ctx      = new AC();
      audioCtxRef.current = ctx;
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize              = 256;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Float32Array(analyser.fftSize);

      const tickLevel = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const s of buf) sum += s * s;
        const rms = Math.sqrt(sum / buf.length);
        // Typical speech RMS ≈ 0.05; scale so 0.1 → 1.0
        setAudioLevel(Math.min(1, rms * 10));
        rafRef.current = requestAnimationFrame(tickLevel);
      };
      rafRef.current = requestAnimationFrame(tickLevel);
    }

    // ── 3. Elapsed timer (100 ms ticks) ──────────────────────────────────
    timerRef.current = setInterval(() => {
      elapsedRef.current = Math.round((elapsedRef.current + 0.1) * 10) / 10;
      setElapsedSeconds(Math.floor(elapsedRef.current));
    }, 100);

    // ── 4. Hard auto-stop ─────────────────────────────────────────────────
    autoStopRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, maxDurationSeconds * 1000);

    // ── 5. MediaRecorder ─────────────────────────────────────────────────
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType: mime });

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      teardown();
      setIsRecording(false);
      resolveStopRef.current?.(blob);
      resolveStopRef.current = null;
      rejectStopRef.current  = null;
    };

    recorder.onerror = (ev) => {
      const msg = (ev as Event & { error?: { message?: string } }).error?.message ?? "Recording error.";
      teardown();
      setIsRecording(false);
      setError(msg);
      rejectStopRef.current?.(new Error(msg));
      resolveStopRef.current = null;
      rejectStopRef.current  = null;
    };

    recorderRef.current = recorder;
    recorder.start(100); // collect data every 100 ms
    setIsRecording(true);
  }, [maxDurationSeconds, teardown]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        reject(new Error("No active recording to stop."));
        return;
      }
      resolveStopRef.current = resolve;
      rejectStopRef.current  = reject;
      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    // Drop promise handles so onstop does not resolve/reject.
    resolveStopRef.current = null;
    rejectStopRef.current  = null;

    if (recorderRef.current?.state !== "inactive") {
      try { recorderRef.current?.stop(); } catch { /* ignore */ }
    }

    teardown();
    setIsRecording(false);
    setElapsedSeconds(0);
    setAudioLevel(0);
    elapsedRef.current = 0;
    chunksRef.current  = [];
  }, [teardown]);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    elapsedSeconds,
    audioLevel,
    error,
  };
}

// ---------------------------------------------------------------------------
// uploadRecording
// ---------------------------------------------------------------------------

/**
 * Uploads a recorded Blob to the `recordings` Supabase Storage bucket.
 *
 * The generated path is `{userId}/{timestamp}-{uuid}.webm`, which keeps files
 * organised per user and guarantees uniqueness without a DB round-trip.
 *
 * @returns The storage path (use this to create a DB row or signed URL).
 * @throws  If the upload fails.
 */
export async function uploadRecording(
  blob: Blob,
  userId: string,
  supabase: SupabaseClient,
  options: UploadOptions = {},
): Promise<string> {
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.webm`;

  options.onProgress?.(0);

  const { error } = await supabase.storage
    .from("recordings")
    .upload(path, blob, {
      contentType: "audio/webm",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  options.onProgress?.(100);
  return path;
}

// ---------------------------------------------------------------------------
// useAnalyzeRecording
// ---------------------------------------------------------------------------

/**
 * Triggers the `analyze-recording` edge function and keeps the UI up-to-date
 * via a Supabase Realtime subscription (with a 3 s polling fallback).
 *
 * @param recordingId - The `id` of the recording row in your database.
 * @param supabase    - Initialised Supabase client (with auth session).
 */
export function useAnalyzeRecording(
  recordingId: string,
  supabase: SupabaseClient,
): UseAnalyzeRecordingResult {
  const queryClient = useQueryClient();
  const queryKey    = ["analysis", recordingId] as const;

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!recordingId) return;

    const channel = supabase
      .channel(`analysis:${recordingId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "analyses",
          filter: `recording_id=eq.${recordingId}`,
        },
        (payload) => {
          queryClient.setQueryData<AnalysisResult>(
            queryKey,
            payload.new as AnalysisResult,
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // queryKey is derived from recordingId – no need to list separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId, supabase]);

  // ── Polling fallback ─────────────────────────────────────────────────────
  // Stops refetching once the row lands (either via realtime or poll).
  const { data: analysis = null } = useQuery<AnalysisResult | null>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("recording_id", recordingId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled:        !!recordingId,
    refetchInterval: (query) => (query.state.data ? false : 3_000),
    staleTime:       Infinity,
  });

  // ── Mutation ─────────────────────────────────────────────────────────────
  const { mutate, isPending, error: mutationError } = useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("analyze-recording", {
        body: { recording_id: recordingId },
      });
      if (error) throw new Error(error.message);
    },
  });

  return {
    analyze:   mutate,
    isLoading: isPending,
    analysis,
    error:     mutationError?.message ?? null,
  };
}

// ---------------------------------------------------------------------------
// useWaveformVisualizer
// ---------------------------------------------------------------------------

/**
 * Converts a single `audioLevel` (0–1) into an array of bar heights (0–100)
 * with a bell-shaped distribution across the bars and exponential decay so
 * bars fall gracefully instead of jumping.
 *
 * Re-runs every time `audioLevel` changes (driven by the rAF loop in useRecorder),
 * so it naturally stays in sync with the recorded signal.
 *
 * @param audioLevel - Current RMS level from useRecorder.
 * @param barCount   - Number of bars to render.
 * @returns Array of heights in the range [0, 100].
 */
export function useWaveformVisualizer(
  audioLevel: number,
  barCount: number,
): number[] {
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(0));

  useEffect(() => {
    const DECAY   = 0.82; // multiplier applied to falling bars (< 1 = faster decay)
    const target  = audioLevel * 100;

    setBars((prev) => {
      // Resize if barCount changed
      const current = prev.length === barCount ? prev : Array(barCount).fill(0);

      return current.map((height, i) => {
        // Bell curve: centre bars taller, edges shorter
        const spread = Math.sin((Math.PI * (i + 0.5)) / barCount);
        // Organic noise: ±15% variation per bar per frame
        const noise  = 0.85 + Math.random() * 0.3;
        const peak   = target * spread * noise;

        // Rise immediately to peak, decay smoothly when signal drops
        const next = peak > height ? peak : height * DECAY;
        return Math.max(0, Math.min(100, next));
      });
    });
  }, [audioLevel, barCount]);

  return bars;
}

// ---------------------------------------------------------------------------
// Usage examples (not compiled – for reference only)
// ---------------------------------------------------------------------------

/*

// ── useRecorder ─────────────────────────────────────────────────────────────

function RecordButton() {
  const {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    elapsedSeconds,
    audioLevel,
    error,
  } = useRecorder(120); // 2-minute hard limit

  const handleStop = async () => {
    const blob = await stopRecording();
    const path = await uploadRecording(blob, user.id, supabase, {
      onProgress: (pct) => console.log(`Upload: ${pct}%`),
    });
    console.log("Stored at:", path);
  };

  return (
    <div>
      {error && <p className="text-destructive">{error}</p>}
      {isRecording ? (
        <>
          <p>Recording… {elapsedSeconds}s</p>
          <WaveformBars audioLevel={audioLevel} />
          <button onClick={handleStop}>Stop</button>
          <button onClick={cancelRecording}>Cancel</button>
        </>
      ) : (
        <button onClick={startRecording}>Start</button>
      )}
    </div>
  );
}


// ── uploadRecording ─────────────────────────────────────────────────────────

// Typically called right after stopRecording():
const path = await uploadRecording(blob, session.user.id, supabase, {
  onProgress: setUploadProgress, // e.g. useState<number>(0)
});
// Then insert a recording row pointing to `path`:
await supabase.from("recordings").insert({ user_id: session.user.id, storage_path: path });


// ── useAnalyzeRecording ──────────────────────────────────────────────────────

function AnalysisPanel({ recordingId }: { recordingId: string }) {
  const { analyze, isLoading, analysis, error } = useAnalyzeRecording(recordingId, supabase);

  useEffect(() => {
    analyze(); // kick off edge function immediately on mount
  }, []);     // analyze is stable across renders

  if (isLoading && !analysis) return <Spinner />;
  if (error)                   return <p>Error: {error}</p>;
  if (!analysis)               return <p>Waiting for analysis…</p>;

  return (
    <div>
      <p>Score: {analysis.score}</p>
      <p>WPM: {analysis.pace_wpm}</p>
      <p>{analysis.transcript}</p>
    </div>
  );
}


// ── useWaveformVisualizer ────────────────────────────────────────────────────

function WaveformBars({ audioLevel }: { audioLevel: number }) {
  const bars = useWaveformVisualizer(audioLevel, 32);

  return (
    <div className="flex items-end gap-0.5 h-12">
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-primary rounded-full transition-none"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

*/
