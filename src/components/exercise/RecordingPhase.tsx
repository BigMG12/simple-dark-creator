import { type ReactNode } from "react";
import { Square } from "lucide-react";
import { useExerciseFlow } from "@/hooks/exercise/useExerciseFlow";
import { useExercise } from "@/contexts/ExerciseContext";
import TimerCircle from "./TimerCircle";
import WaveformBar from "./WaveformBar";

interface Props {
  children?: ReactNode;
}

export default function RecordingPhase({ children }: Props) {
  const { current } = useExercise();
  const { elapsedSeconds, stopRecording } = useExerciseFlow();
  const total = current?.durationSeconds ?? 60;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-300">
          Nagrywanie
        </span>
      </div>

      {children && (
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface/50 p-6">
          {children}
        </div>
      )}

      <TimerCircle elapsed={elapsedSeconds} total={total} label="Pozostało" />

      <div className="w-full max-w-md">
        <WaveformBar active />
      </div>

      <button
        onClick={stopRecording}
        className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-elegant transition-all hover:-translate-y-0.5 hover:bg-rose-400"
      >
        <Square className="h-4 w-4 fill-white" />
        Zakończ nagrywanie
      </button>
    </div>
  );
}
