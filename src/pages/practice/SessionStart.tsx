import { Brain, Play } from "lucide-react";
import ExerciseLayout from "@/pages/exercise/ExerciseLayout";

export default function SessionStart() {
  // TODO (Claude Code): podepnij useStartAdaptiveSession hook
  const mockWeakness = "słowa-wypełniacze (\"yyy\", \"znaczy\")";
  const mockExerciseCount = 3;

  const handleStart = () => {
    // TODO (Claude Code): wywołaj build_adaptive_session RPC
    alert("Adaptive session start — TODO Claude Code");
  };

  return (
    <ExerciseLayout title="Adaptive Session" subtitle="Sesja dopasowana przez AI">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface ring-1 ring-primary/30 shadow-elegant">
          <Brain className="h-8 w-8 text-primary" />
        </div>

        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          AI wybrał dla Ciebie
        </div>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {mockExerciseCount}{" "}
          <span className="text-gradient-primary">ćwiczenia</span>
        </h2>

        <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Bazując na ostatnich sesjach, Twoja największa słabość to{" "}
          <span className="font-medium text-foreground">{mockWeakness}</span>.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Przygotowałem sekwencję: <span className="text-foreground">rozgrzewka</span> →{" "}
          <span className="text-foreground">improwizacja</span> →{" "}
          <span className="text-foreground">wyzwanie</span>. Każde ćwiczenie atakuje
          Twoją słabość z innej strony.
        </p>

        <button
          onClick={handleStart}
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow"
        >
          <Play className="h-5 w-5" />
          Zaczynam trening
        </button>

        <p className="mt-4 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Trwa około 10–15 minut
        </p>
      </div>
    </ExerciseLayout>
  );
}
