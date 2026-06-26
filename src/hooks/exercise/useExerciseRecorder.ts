import { useEffect, useRef, useState } from "react";
import { useMediaRecorder } from "@/hooks/use-media-recorder";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";

/**
 * Real audio recorder for exercise flow.
 * - Requests mic on mount.
 * - Auto-starts recording once stream is ready.
 * - Exposes blob (after stop) + live levels for waveform.
 * - Cleans up tracks/timers on unmount.
 */
export function useExerciseRecorder() {
  const recorder = useMediaRecorder();
  const levels = useAudioAnalyser(recorder.stream, 48);
  const [blob, setBlob] = useState<Blob | null>(null);
  const startedRef = useRef(false);

  // Request mic permission once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (recorder.state !== "idle") return;
      const s = await recorder.requestPermission();
      if (cancelled || !s) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start once ready.
  useEffect(() => {
    if (recorder.state === "ready" && recorder.stream && !startedRef.current) {
      startedRef.current = true;
      recorder.start(recorder.stream);
    }
  }, [recorder.state, recorder.stream, recorder]);

  // Capture blob after stop.
  useEffect(() => {
    if (recorder.state === "stopped" && recorder.blobRef.current) {
      setBlob(recorder.blobRef.current);
    }
  }, [recorder.state, recorder.blobRef]);

  // Hard teardown on unmount.
  useEffect(() => {
    return () => {
      try {
        recorder.teardown();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state: recorder.state,
    error: recorder.error,
    levels,
    blob,
    stop: recorder.stop,
  };
}
