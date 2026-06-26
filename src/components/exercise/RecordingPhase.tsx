import { useEffect, type ReactNode } from "react";
import { Square, AlertTriangle } from "lucide-react";
import { useExerciseFlow } from "@/hooks/exercise/useExerciseFlow";
import { useExercise } from "@/contexts/ExerciseContext";
import { useExerciseRecorder } from "@/hooks/exercise/useExerciseRecorder";
import TimerCircle from "./TimerCircle";
import { LiveWaveform } from "@/components/record/LiveWaveform";

interface Props {
  children?: ReactNode;
}

export default function RecordingPhase({ children }: Props) {
  const { current, setRecordingBlob } = useExercise();
  const { elapsedSeconds, stopRecording } = useExerciseFlow();
  const total = current?.durationSeconds ?? 60;

  const { state, error, levels, blob, stop } = useExerciseRecorder();

  // When user clicks stop OR auto-stop fires (phase → analyzing handled by flow),
  // we must stop MediaRecorder. We listen to either: user click or external phase change.
  // Strategy: when elapsed >= total, stop recorder; when blob ready, save to context.
  useEffect(() => {
    if (elapsedSeconds >= total && state === "recording") {
      stop();
    }
  }, [elapsedSeconds, total, state, stop]);

  useEffect(() => {
    if (blob) {
      setRecordingBlob(blob);
    }
  }, [blob, setRecordingBlob]);

  const handleStop = () => {
    stop();
    stopRecording();
  };

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-400" />
        <h2 className="font-display text-xl font-semibold">Brak dostępu do mikrofonu</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error?.message ?? "Sprawdź uprawnienia przeglądarki i spróbuj ponownie."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-300">
          {state === "recording" ? "Nagrywanie" : state === "requesting" ? "Uruchamiam mikrofon…" : "Przygotowanie…"}
        </span>
      </div>

      {children && (
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface/50 p-6">
          {children}
        </div>
      )}

      <TimerCircle elapsed={elapsedSeconds} total={total} label="Pozostało" />

      <div className="w-full max-w-2xl">
        <LiveWaveform levels={levels} />
      </div>

      <button
        onClick={handleStop}
        disabled={state !== "recording"}
        className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-elegant transition-all hover:-translate-y-0.5 hover:bg-rose-400 disabled:opacity-50"
      >
        <Square className="h-4 w-4 fill-white" />
        Zakończ nagrywanie
      </button>
    </div>
  );
}
