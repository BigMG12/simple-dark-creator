import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "ready" | "recording" | "stopped" | "error";

export type RecorderError =
  | { kind: "denied"; message: string }
  | { kind: "notfound"; message: string }
  | { kind: "unsupported"; message: string }
  | { kind: "unknown"; message: string };

export function isMediaRecorderSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

export function useMediaRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);

  const requestPermission = useCallback(async () => {
    if (!isMediaRecorderSupported()) {
      setError({ kind: "unsupported", message: "Your browser does not support audio recording." });
      setState("error");
      return null;
    }
    setState("requesting");
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);
      setState("ready");
      return s;
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError({ kind: "denied", message: "Microphone access was denied." });
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError({ kind: "notfound", message: "No microphone was found on this device." });
      } else {
        setError({ kind: "unknown", message: e?.message ?? "Could not access microphone." });
      }
      setState("error");
      return null;
    }
  }, []);

  const start = useCallback(
    (s: MediaStream) => {
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(s, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const baseMime = mime.split(";")[0];
        blobRef.current = new Blob(chunksRef.current, { type: baseMime });
        setState("stopped");
      };
      recorderRef.current = rec;
      rec.start(100);
      setState("recording");
    },
    [],
  );

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const teardown = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setState("idle");
  }, [stream]);

  return { state, error, stream, requestPermission, start, stop, teardown, blobRef };
}
