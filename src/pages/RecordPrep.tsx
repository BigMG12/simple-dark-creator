import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordingSession } from "@/hooks/use-recording-session";

export default function RecordPrep() {
  const navigate = useNavigate();
  const [count, setCount] = useState(15);
  const session = recordingSession.get();

  useEffect(() => {
    if (!session.topic) {
      navigate("/record", { replace: true });
      return;
    }
    if (count <= 0) {
      navigate("/record/live", { replace: true });
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, navigate, session.topic]);

  const handleBack = () => {
    const backTo =
      session.source === "drill" && session.drillId
        ? `/drills/${session.drillId}`
        : "/record";
    recordingSession.clear();
    navigate(backTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden flex items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 bg-primary/5 blur-3xl" />

      <button
        type="button"
        onClick={handleBack}
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Wróć
      </button>

      <div className="relative z-10 max-w-3xl w-full text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
          Przygotuj się
        </div>

        {session.speaker && (
          <div className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-mono uppercase tracking-widest mb-4">
            Wyzwanie {session.speaker}
          </div>
        )}

        <h1 className="font-display text-3xl md:text-5xl leading-tight mb-12 text-balance">
          "{session.topic}"
        </h1>

        <div className="relative inline-flex items-center justify-center mb-10">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
          <div className="relative h-40 w-40 rounded-full bg-surface border border-border flex items-center justify-center">
            <span className="font-mono text-6xl text-gradient-primary">{count}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="fire" size="xl" onClick={() => navigate("/record/live", { replace: true })} className="animate-pulse">
            Rozpocznij nagrywanie
          </Button>
          <Button variant="ghost-dark" onClick={() => setCount(0)}>
            Pomiń przygotowanie
          </Button>
        </div>
      </div>
    </div>
  );
}
