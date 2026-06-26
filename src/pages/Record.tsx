import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mic, MessageSquare } from "lucide-react";
import { TopicPicker } from "@/components/record/TopicPicker";
import { DurationToggle } from "@/components/record/DurationToggle";
import { CustomTopicDialog } from "@/components/record/CustomTopicDialog";
import { BrowserUnsupported } from "@/components/record/BrowserUnsupported";
import { isMediaRecorderSupported } from "@/hooks/use-media-recorder";
import { recordingSession, type RecordingMode } from "@/hooks/use-recording-session";
import { pickRandomTopic, pickRandomChallenge, type Duration } from "@/data/topics";
import { getDrillById } from "@/data/drills";
import { cn } from "@/lib/utils";

type Mode = "practice" | "conversation";

export default function Record() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [duration, setDuration] = useState<Duration>(60);
  const [customOpen, setCustomOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("practice");

  // Drill direct-entry: /record?drillId=xyz → skip arena, load drill, go to prep.
  useEffect(() => {
    const drillId = params.get("drillId");
    if (!drillId) return;
    const drill = getDrillById(drillId);
    if (!drill) return;
    const text =
      drill.contentKind === "words"
        ? `${drill.instructions} Słowa: ${(drill.wordList ?? []).join(", ")}`
        : drill.content;
    recordingSession.set({
      topic: text,
      duration: 60,
      mode: "custom",
      speaker: `Drill: ${drill.title}`,
    });
    navigate("/record/prep", { replace: true });
  }, [params, navigate]);

  if (!isMediaRecorderSupported()) return <BrowserUnsupported />;

  const handlePick = (m: RecordingMode) => {
    if (m === "random") {
      recordingSession.set({ topic: pickRandomTopic(), duration, mode: "random" });
      navigate("/record/prep");
    } else if (m === "challenge") {
      const c = pickRandomChallenge();
      recordingSession.set({ topic: c.prompt, duration, mode: "challenge", speaker: c.speaker });
      navigate("/record/prep");
    } else {
      setCustomOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Mode switch */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface border border-border">
            <button
              type="button"
              onClick={() => setMode("practice")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-all",
                mode === "practice"
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Mic className="h-3.5 w-3.5" /> Sesja treningowa
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("conversation");
                navigate("/conversations/new");
              }}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-all",
                mode === "conversation"
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Analizuj prawdziwą rozmowę
            </button>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Krok 1 z 3
          </div>
          <h1 className="font-display text-5xl md:text-6xl mb-3">
            Wybierz swoją <span className="text-gradient-primary">Arenę</span>
          </h1>
          <p className="text-muted-foreground text-lg">Wybierz, jak chcesz się dzisiaj wyzwać.</p>
        </div>

        <TopicPicker onPick={handlePick} />

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Czas trwania
          </div>
          <DurationToggle value={duration} onChange={setDuration} />
        </div>
      </div>

      <CustomTopicDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        onSubmit={(topic) => {
          recordingSession.set({ topic, duration, mode: "custom" });
          setCustomOpen(false);
          navigate("/record/prep");
        }}
      />
    </div>
  );
}
