import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Shuffle } from "lucide-react";
import ExerciseLayout from "@/pages/exercise/ExerciseLayout";
import { useExercise } from "@/contexts/ExerciseContext";
import { pickRandomTopic, DURATIONS, type Duration } from "@/data/topics";
import TopicDisplay from "@/components/exercise/TopicDisplay";
import PreparationPhase from "@/components/exercise/PreparationPhase";
import RecordingPhase from "@/components/exercise/RecordingPhase";
import AnalyzingPhase from "@/components/exercise/AnalyzingPhase";

export default function ImpromptuExercise() {
  const navigate = useNavigate();
  const { phase, setPhase, setCurrent, reset } = useExercise();
  const [topic, setTopic] = useState<string>(() => pickRandomTopic());
  const [duration, setDuration] = useState<Duration>(60);

  useEffect(() => {
    setCurrent({ type: "impromptu", topic, durationSeconds: duration });
    setPhase("preview");
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrent({ type: "impromptu", topic, durationSeconds: duration });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, duration]);

  return (
    <ExerciseLayout title="Impromptu" subtitle="Losowy temat, zero przygotowania">
      {phase === "preview" && (
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="rounded-2xl border border-border bg-surface/50 p-8 sm:p-12">
            <TopicDisplay topic={topic} eyebrow="Twój losowy temat" />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setTopic(pickRandomTopic())}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Shuffle className="h-4 w-4" />
              Wylosuj inny
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Długość
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    duration === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2">
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
          <TopicDisplay topic={topic} compact />
        </PreparationPhase>
      )}

      {phase === "recording" && (
        <RecordingPhase>
          <TopicDisplay topic={topic} compact />
        </RecordingPhase>
      )}

      {phase === "analyzing" && (
        <AnalyzingPhase onComplete={() => navigate(`/results/mock-${Date.now()}`)} />
      )}
    </ExerciseLayout>
  );
}
