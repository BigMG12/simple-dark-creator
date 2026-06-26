import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Star, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/nav/AppShell";
import { DRILLS, DRILL_CATEGORIES, getFeaturedDrill, type DrillCategory } from "@/data/drills";

function Stars({ value, max = 5, className }: { value: number; max?: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < value ? "fill-accent text-accent" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

export default function Drills() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<"Wszystkie" | DrillCategory>("Wszystkie");
  const [difficulty, setDifficulty] = useState<number | null>(null);

  const featured = useMemo(() => getFeaturedDrill(), []);

  const drills = useMemo(() => {
    return DRILLS.filter((d) => {
      if (category !== "Wszystkie" && d.category !== category) return false;
      if (difficulty !== null && d.difficulty !== difficulty) return false;
      return true;
    });
  }, [category, difficulty]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-10 lg:py-14 space-y-10">
        {/* Header */}
        <header className="text-center max-w-2xl mx-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            Codzienny trening
          </div>
          <h1 className="font-display text-4xl md:text-5xl mb-3">
            Wyostrz swoje <span className="text-gradient-primary">Narzędzia</span>
          </h1>
          <p className="text-muted-foreground">
            Krótkie, skoncentrowane ćwiczenia. Każdego dnia stajesz się silniejszy.
          </p>
        </header>

        {/* Featured drill hero */}
        <button
          type="button"
          onClick={() => navigate(`/drills/${featured.id}`)}
          className="group relative w-full text-left rounded-2xl bg-gradient-primary p-8 md:p-10 shadow-elegant hover:shadow-glow transition-all overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/20 backdrop-blur text-primary-foreground text-[10px] font-mono uppercase tracking-[0.3em]">
                <Sparkles className="h-3 w-3" />
                Ćwiczenie dnia
              </div>
              <h2 className="font-display text-3xl md:text-5xl text-primary-foreground leading-tight max-w-xl">
                {featured.title}
              </h2>
              <p className="text-primary-foreground/80 max-w-md">{featured.description}</p>
              <div className="flex items-center gap-4 text-primary-foreground/90 text-xs font-mono uppercase tracking-wider">
                <span>{featured.category}</span>
                <span className="opacity-50">•</span>
                <Stars value={featured.difficulty} className="!text-primary-foreground" />
                <span className="opacity-50">•</span>
                <span>+{featured.xp} XP</span>
              </div>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-background text-foreground font-semibold shadow-elegant group-hover:-translate-y-0.5 transition-transform">
                <Flame className="h-4 w-4 text-primary" />
                Rozpocznij teraz
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </button>

        {/* Filters */}
        <div className="space-y-4">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {DRILL_CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-mono uppercase tracking-wider transition-all",
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                      : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Difficulty filter */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
              Trudność
            </span>
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-surface">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = difficulty === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Trudność ${n}`}
                    onClick={() => setDifficulty(active ? null : n)}
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center transition-all",
                      active
                        ? "bg-gradient-gold shadow-elegant"
                        : "hover:bg-background/50",
                    )}
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        active
                          ? "fill-accent-foreground text-accent-foreground"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {difficulty !== null && (
              <button
                type="button"
                onClick={() => setDifficulty(null)}
                className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {drills.length === 0 ? (
          <div className="card-premium p-10 text-center max-w-md mx-auto">
            <Flame className="h-7 w-7 text-primary mx-auto mb-3" />
            <p className="font-display text-lg mb-1">Brak ćwiczeń w tej kategorii.</p>
            <p className="text-sm text-muted-foreground mb-5">Poluzuj filtry i spróbuj ponownie.</p>
            <Button
              variant="ghost-dark"
              size="sm"
              onClick={() => {
                setCategory("Wszystkie");
                setDifficulty(null);
              }}
            >
              Resetuj filtry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drills.map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/drills/${d.id}`)}
                className="tap-press card-premium p-5 flex flex-col cursor-pointer relative"
              >
                {d.completed && (
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-gold flex items-center justify-center shadow-elegant">
                    <Check className="h-4 w-4 text-accent-foreground" strokeWidth={3} />
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {d.category}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-accent">
                    +{d.xp} XP
                  </span>
                </div>
                <h3 className="font-display text-lg leading-tight mb-2">{d.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{d.description}</p>
                <div className="mt-auto flex items-center justify-between">
                  <Stars value={d.difficulty} />
                  <Button variant="ghost-dark" size="sm">
                    Rozpocznij
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
