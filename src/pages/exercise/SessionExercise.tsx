import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Play, Zap, Target, PenLine } from "lucide-react";
import ExerciseLayout from "@/pages/exercise/ExerciseLayout";
import { useExercise } from "@/contexts/ExerciseContext";
import { useSessionProgress } from "@/hooks/session/useSessionProgress";
import { getDrillById, DRILLS } from "@/data/drills";
import { pickRandomTopic } from "@/data/topics";
import DrillTextDisplay from "@/components/exercise/DrillTextDisplay";
import TopicDisplay from "@/components/exercise/TopicDisplay";
import PreparationPhase from "@/components/exercise/PreparationPhase";
import RecordingPhase from "@/components/exercise/RecordingPhase";
import AnalyzingPhase from "@/components/exercise/AnalyzingPhase";

interface MockStep {
  order: number;
  type: "drill" | "impromptu" | "custom";
  drill_id?: string | null;
  topic?: string;
  duration_seconds?: number;
  reason: string;
}

// Fallback sequence used when backend session not yet available.
const FALLBACK_SEQUENCE: MockStep[] = [
  { order: 1, type: "drill", drill_id: DRILLS[0]?.id, reason: "Rozgrzewka" },
  { order: 2, type: "impromptu", duration_seconds: 60, reason: "Aplikacja pod presją" },
  { order: 3, type: "drill", drill_id: DRILLS[7]?.id, reason: "Wyzwanie" },
];

const TYPE_META = {
  drill: { icon: Zap, label: "Drill", color: "text-amber-400" },
  impromptu: { icon: Target, label: "Impromptu", color: "text-sky-400" },
  custom: { icon: PenLine, label: "Twój temat", color: "text-emerald-400" },
} as const;

export default function SessionExercise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { phase, setPhase, setCurrent, reset } = useExercise();
  const { data: session } = useSessionProgress(id);

  const [stepIndex, setStepIndex] = useState(0);
  const [topic] = useState(() => pickRandomTopic());

  const sequence: MockStep[] = (session?.exercise_sequence as MockStep[] | undefined) ?? FALLBACK_SEQUENCE;
  const totalSteps = sequence.length;
  const currentStep = sequence[stepIndex];

  const drill =
    currentStep?.type === "drill"
      ? getDrillById(currentStep.drill_id ?? "") ?? DRILLS[0]
      : undefined;

  useEffect(() => {
    if (!currentStep) return;
    const duration = currentStep.duration_seconds ?? 60;
    setCurrent({
      type: currentStep.type,
      drillId: drill?.id,
      topic: currentStep.type === "impromptu" ? topic : currentStep.topic,
      durationSeconds: duration,
      sessionId: id,
      stepOrder: currentStep.order,
    });
    setPhase("preview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, currentStep?.order]);

  useEffect(() => {
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = () => {
    // TODO (Claude Code): wywołaj useCompleteSessionExercise z realnym recordingId i score.
    if (stepIndex + 1 >= totalSteps) {
      navigate(`/session/summary/${id}`);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  if (!currentStep) {
    return (
      <ExerciseLayout title="Sesja">
        <div className="py-20 text-center text-muted-foreground">Ładowanie sesji…</div>
      </ExerciseLayout>
    );
  }

  const meta = TYPE_META[currentStep.type];
  const Icon = meta.icon;

  return (
    <ExerciseLayout
      title={`Adaptive Session`}
      subtitle={`${stepIndex + 1} z ${totalSteps} — ${meta.label}`}
      showProgress
      progressCurrent={stepIndex + (phase === "analyzing" ? 1 : 0)}
      progressTotal={totalSteps}
    >
      {phase === "preview" && (
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface ring-1 ring-border ${meta.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Krok {stepIndex + 1} — {currentStep.reason}
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {meta.label}
            </h2>
          </div>

          <div className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-10">
            {drill ? (
              <DrillTextDisplay drill={drill} />
            ) : (
              <TopicDisplay topic={currentStep.topic ?? topic} />
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setPhase("preparing")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <Play className="h-5 w-5" />
              Lecimy
            </button>
          </div>
        </div>
      )}

      {phase === "preparing" && (
        <PreparationPhase>
          {drill ? <DrillTextDisplay drill={drill} compact /> : <TopicDisplay topic={currentStep.topic ?? topic} compact />}
        </PreparationPhase>
      )}

      {phase === "recording" && (
        <RecordingPhase>
          {drill ? <DrillTextDisplay drill={drill} compact /> : <TopicDisplay topic={currentStep.topic ?? topic} compact />}
        </RecordingPhase>
      )}

      {phase === "analyzing" && <AnalyzingPhase onComplete={advance} />}
    </ExerciseLayout>
  );
}
