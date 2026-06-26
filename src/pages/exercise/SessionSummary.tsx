import { useNavigate, useParams } from "react-router-dom";
import { Trophy, Sparkles, RotateCcw, Home } from "lucide-react";
import ExerciseLayout from "@/pages/exercise/ExerciseLayout";
import { useSessionProgress } from "@/hooks/session/useSessionProgress";

export default function SessionSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session } = useSessionProgress(id);

  // Fallback mock when backend isn't ready yet.
  const completed = session?.completed_exercises ?? 3;
  const total = session?.exercise_count ?? 3;
  const xp = session?.total_xp_earned ?? 75;
  const avg = Math.round(session?.average_score ?? 82);
  const weakness = session?.weakness_focus ?? "general";

  const WEAKNESS_LABEL: Record<string, string> = {
    fillers: "słowa-wypełniacze",
    pace: "tempo mówienia",
    energy: "energia",
    pauses: "pauzy",
    clarity: "klarowność",
    general: "wszechstronna forma",
  };

  return (
    <ExerciseLayout title="Sesja zakończona" subtitle="Podsumowanie">
      <div className="mx-auto max-w-2xl space-y-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Trophy className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Robota wykonana
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {completed} z {total}{" "}
            <span className="text-gradient-primary">ćwiczeń</span>
          </h1>
          <p className="max-w-md text-muted-foreground">
            Atakowałeś dziś:{" "}
            <span className="font-medium text-foreground">{WEAKNESS_LABEL[weakness]}</span>.
            Tak się buduje formę.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-border bg-surface/50 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Średni wynik
            </div>
            <div className="mt-2 font-display text-4xl font-semibold tabular-nums">
              {avg}
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Zdobyte XP
            </div>
            <div className="mt-2 inline-flex items-baseline gap-1 font-display text-4xl font-semibold tabular-nums">
              <Sparkles className="h-5 w-5 text-amber-400" />
              +{xp}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate("/session/start")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <RotateCcw className="h-4 w-4" />
            Jeszcze raz
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface/70"
          >
            <Home className="h-4 w-4" />
            Wróć na start
          </button>
        </div>
      </div>
    </ExerciseLayout>
  );
}
