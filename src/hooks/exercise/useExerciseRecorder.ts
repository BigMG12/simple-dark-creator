import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";

type State = "idle" | "requesting" | "ready" | "recording" | "stopped" | "error";

interface RecorderError {
  kind: "denied" | "notfound" | "unsupported" | "unknown";
  message: string;
}

function isSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

/**
 * Real audio recorder for the exercise flow.
 * Owns its own MediaRecorder so we can resolve a Promise on `stop()`
 * synchronously with the blob — avoiding the race where the parent
 * unmounts before MediaRecorder.onstop fires.
 */
export function useExerciseRecorder() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobResolversRef = useRef<((b: Blob) => void)[]>([]);
  const finalBlobRef = useRef<Blob | null>(null);
  const startedRef = useRef(false);
  const requestedRef = useRef(false);

  const levels = useAudioAnalyser(stream, 48);

  // Request mic once on mount.
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    if (!isSupported()) {
      setError({ kind: "unsupported", message: "Twoja przeglądarka nie obsługuje nagrywania audio." });
      setState("error");
      return;
    }

    setState("requesting");
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(s);
        setState("ready");
      } catch (e: any) {
        const name = e?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError({ kind: "denied", message: "Brak dostępu do mikrofonu." });
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError({ kind: "notfound", message: "Nie znaleziono mikrofonu." });
        } else {
          setError({ kind: "unknown", message: e?.message ?? "Nie udało się uruchomić mikrofonu." });
        }
        setState("error");
      }
    })();
  }, []);

  // Auto-start on ready.
  useEffect(() => {
    if (state !== "ready" || !stream || startedRef.current) return;
    startedRef.current = true;

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const rec = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];

    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    rec.onstop = () => {
      const baseMime = mime.split(";")[0];
      const blob = new Blob(chunksRef.current, { type: baseMime });
      finalBlobRef.current = blob;
      setState("stopped");
      // Resolve any pending waiters.
      const waiters = blobResolversRef.current;
      blobResolversRef.current = [];
      waiters.forEach((r) => r(blob));
    };

    recorderRef.current = rec;
    rec.start(100);
    setState("recording");
  }, [state, stream]);

  /** Stops recording and resolves with the finalized Blob. */
  const stopAndAwait = useCallback((): Promise<Blob> => {
    if (finalBlobRef.current) return Promise.resolve(finalBlobRef.current);
    return new Promise<Blob>((resolve) => {
      blobResolversRef.current.push(resolve);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch (e) {
          console.warn("[useExerciseRecorder] stop failed", e);
        }
      }
    });
  }, []);

  // Hard teardown on unmount.
  useEffect(() => {
    return () => {
      try {
        const rec = recorderRef.current;
        if (rec && rec.state !== "inactive") rec.stop();
      } catch {}
      stream?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  return {
    state,
    error,
    levels,
    blob: finalBlobRef.current,
    stopAndAwait,
  };
}
