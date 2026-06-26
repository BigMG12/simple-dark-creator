import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Flame, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/nav/AppShell";
import { getDrillById, type Drill } from "@/data/drills";

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < value ? "fill-accent text-accent" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function ContentBlock({ drill }: { drill: Drill }) {
  switch (drill.contentKind) {
    case "phrase":
      return (
        <div className="relative text-center py-10">
          <span className="absolute -top-2 left-0 font-display text-7xl text-primary/20 leading-none">
            “
          </span>
          <p className="font-display text-3xl md:text-5xl leading-tight text-gradient-primary px-6">
            {drill.content}
          </p>
          <span className="absolute -bottom-8 right-0 font-display text-7xl text-primary/20 leading-none">
            ”
          </span>
        </div>
      );
    case "prompt":
      return (
        <div className="relative text-center py-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-4">
            Twój temat
          </div>
          <p className="font-display text-2xl md:text-4xl leading-snug max-w-2xl mx-auto">
            {drill.content}
          </p>
        </div>
      );
    case "passage":
      return (
        <div className="py-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-4 text-center">
            Przeczytaj na głos
          </div>
          <p className="font-display text-xl md:text-2xl leading-relaxed text-center max-w-3xl mx-auto">
            {drill.content}
          </p>
        </div>
      );
    case "words":
      return (
        <div className="py-6 space-y-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground text-center">
            Użyj każdego słowa
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {drill.wordList?.map((w) => (
              <span
                key={w}
                className="px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground font-display text-lg shadow-elegant"
              >
                {w}
              </span>
            ))}
          </div>
          <p className="text-center text-muted-foreground italic">{drill.content}</p>
        </div>
      );
  }
}

export default function DrillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const drill = id ? getDrillById(id) : undefined;

  if (!drill) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-5 py-20 text-center space-y-4">
          <h1 className="font-display text-3xl">Ćwiczenie nie znalezione</h1>
          <Button variant="ghost-dark" onClick={() => navigate("/drills")}>
            <ArrowLeft />
            Powrót do ćwiczeń
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-8">
        <Link
          to="/drills"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wszystkie ćwiczenia
        </Link>

        {/* Header */}
        <header className="space-y-4">
          {drill.previousScore !== undefined && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-gold text-accent-foreground text-[10px] font-mono uppercase tracking-wider font-bold shadow-elegant">
              <Trophy className="h-3 w-3" />
              Poprzedni najlepszy: {drill.previousScore}
            </div>
          )}
          <h1 className="font-display text-4xl md:text-5xl leading-tight">{drill.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border">
              {drill.category}
            </span>
            <Stars value={drill.difficulty} />
            <span className="text-accent">+{drill.xp} XP</span>
          </div>
        </header>

        {/* Instructions */}
        <div className="card-premium p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            Instrukcje
          </div>
          <p className="text-foreground/90 leading-relaxed">{drill.instructions}</p>
        </div>

        {/* Content */}
        <div className="card-premium p-6 md:p-10">
          <ContentBlock drill={drill} />
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="fire"
            size="lg"
            className="flex-1"
            onClick={() => navigate(`/exercise/drill/${drill.id}`)}
          >
            <Flame />
            Rozpocznij ćwiczenie
            <ChevronRight />
          </Button>
          <Button variant="ghost-dark" size="lg" onClick={() => navigate("/drills")}>
            Przeglądaj więcej
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
