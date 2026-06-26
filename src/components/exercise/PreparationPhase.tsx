import { type ReactNode } from "react";
import { useExerciseFlow } from "@/hooks/exercise/useExerciseFlow";

interface Props {
  children?: ReactNode;
  preparationSeconds?: number;
}

export default function PreparationPhase({ children, preparationSeconds = 5 }: Props) {
  const { remainingSeconds } = useExerciseFlow({ preparationSeconds });
  const count = Math.max(1, remainingSeconds);

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        Za chwilę zaczynamy
      </div>
      <div
        key={count}
        className="font-display text-[140px] font-semibold leading-none text-gradient-primary"
        style={{ animation: "fadeInScale 0.4s ease-out" }}
      >
        {count}
      </div>
      {children && (
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface/50 p-6">
          {children}
        </div>
      )}
      <style>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
