import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import ExerciseLayout from "@/pages/exercise/ExerciseLayout";
import { useExercise } from "@/contexts/ExerciseContext";
import { DURATIONS, type Duration } from "@/data/topics";
import TopicDisplay from "@/components/exercise/TopicDisplay";
import PreparationPhase from "@/components/exercise/PreparationPhase";
import RecordingPhase from "@/components/exercise/RecordingPhase";
import AnalyzingPhase from "@/components/exercise/AnalyzingPhase";

const MAX_LEN = 200;

export default function CustomExercise() {
  const navigate = useNavigate();
  const { phase, setPhase, setCurrent, reset, recordingBlob } = useExercise();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<Duration>(60);

  useEffect(() => {
    setPhase("preview");
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!topic.trim()) return;
    setCurrent({ type: "custom", topic: topic.trim(), durationSeconds: duration });
    setPhase("preparing");
  };

  return (
    <ExerciseLayout title="Twój temat" subtitle="Trenuj dokładnie to, co cię czeka">
      {phase === "preview" && (
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              O czym chcesz mówić?
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, MAX_LEN))}
              placeholder="Np. „Przedstaw zespołowi nowy plan na Q3 i przekonaj ich, że to wykonalne.”"
              rows={5}
              className="w-full resize-none rounded-2xl border border-border bg-surface/50 px-5 py-4 font-display text-lg leading-snug outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
            />
            <div className="flex justify-end font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {topic.length}/{MAX_LEN}
            </div>
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
              onClick={start}
              disabled={!topic.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-elegant"
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
