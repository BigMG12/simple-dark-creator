import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Play } from "lucide-react";
import ExerciseLayout from "@/pages/exercise/ExerciseLayout";
import { useExercise } from "@/contexts/ExerciseContext";
import { getDrillById } from "@/data/drills";
import DrillTextDisplay from "@/components/exercise/DrillTextDisplay";
import PreparationPhase from "@/components/exercise/PreparationPhase";
import RecordingPhase from "@/components/exercise/RecordingPhase";
import AnalyzingPhase from "@/components/exercise/AnalyzingPhase";
import type { SubmitRecordingPayload } from "@/hooks/exercise/useSubmitRecording";

export default function DrillExercise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { phase, setPhase, setCurrent, reset } = useExercise();
  const drill = id ? getDrillById(id) : undefined;
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!drill) return;
    setCurrent({
      type: "drill",
      drillId: drill.id,
      durationSeconds: 60,
    });
    setPhase("preview");
    setInitialized(true);
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill?.id]);

  if (!drill) {
    return (
      <ExerciseLayout title="Drill nie znaleziony">
        <div className="text-center text-muted-foreground">
          <button
            onClick={() => navigate("/drills")}
            className="mt-4 underline"
          >
            Wróć do drilli
          </button>
        </div>
      </ExerciseLayout>
    );
  }

  if (!initialized) return null;

  return (
    <ExerciseLayout title={drill.title} subtitle={drill.category}>
      {phase === "preview" && (
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-10">
            <DrillTextDisplay drill={drill} />
          </div>
          <div className="rounded-xl border border-border/50 bg-surface/30 p-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Instrukcje
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{drill.instructions}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => setPhase("preparing")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <Play className="h-5 w-5" />
              Zacznij mówić
            </button>
          </div>
        </div>
      )}

      {phase === "preparing" && (
        <PreparationPhase>
          <DrillTextDisplay drill={drill} compact />
        </PreparationPhase>
      )}

      {phase === "recording" && (
        <RecordingPhase>
          <DrillTextDisplay drill={drill} compact />
        </RecordingPhase>
      )}

      {phase === "analyzing" && (
        <AnalyzingPhase
          onComplete={() => navigate(`/results/mock-${Date.now()}`)}
        />
      )}
    </ExerciseLayout>
  );
}
