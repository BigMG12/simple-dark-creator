import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Star, Flame, Sparkles, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/nav/AppShell";
import { AngryStars } from "@/components/drills/AngryStars";
import { WeakSpotsSection } from "@/components/drills/WeakSpotsSection";
import { RecentAttemptsSection } from "@/components/drills/RecentAttemptsSection";
import { DRILLS, DRILL_CATEGORIES, getFeaturedDrill, type DrillCategory, type Drill } from "@/data/drills";

/** Map previous 0–100 score to 0–3 Angry-Birds stars. */
function scoreToStars(score?: number): number {
  if (typeof score !== "number") return 0;
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
}

export default function Drills() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<"Wszystkie" | DrillCategory>("Wszystkie");
  const [difficulties, setDifficulties] = useState<number[]>([]);

  const featured = useMemo(() => getFeaturedDrill(), []);

  const drills = useMemo(() => {
    return DRILLS.filter((d) => {
      if (category !== "Wszystkie" && d.category !== category) return false;
      if (difficulties.length > 0 && !difficulties.includes(d.difficulty)) return false;
      return true;
    });
  }, [category, difficulties]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header — compact */}
        <header className="text-center max-w-xl mx-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1.5">
            Codzienny trening
          </div>
          <h1 className="font-display text-2xl md:text-3xl leading-tight">
            Wyostrz swoje <span className="text-gradient-primary">Narzędzia</span>
          </h1>
        </header>

        {/* Featured drill hero — compact */}
        <button
          type="button"
          onClick={() => navigate(`/drills/${featured.id}`)}
          className="group relative w-full text-left rounded-2xl bg-gradient-primary p-5 md:p-6 shadow-elegant hover:shadow-glow transition-all overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-background/20 backdrop-blur text-primary-foreground text-[9px] font-mono uppercase tracking-[0.3em]">
                <Sparkles className="h-3 w-3" />
                Ćwiczenie dnia
              </div>
              <h2 className="font-display text-xl md:text-3xl text-primary-foreground leading-tight max-w-xl truncate">
                {featured.title}
              </h2>
              <div className="flex items-center gap-3 text-primary-foreground/90 text-[11px] font-mono uppercase tracking-wider">
                <span>{featured.category}</span>
                <span className="opacity-50">•</span>
                <AngryStars earned={featured.difficulty >= 4 ? 3 : featured.difficulty >= 2 ? 2 : 1} size="sm" />
                <span className="opacity-50">•</span>
                <span>+{featured.xp} XP</span>
              </div>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-background text-foreground font-semibold shadow-elegant group-hover:-translate-y-0.5 transition-transform text-sm">
                <Flame className="h-4 w-4 text-primary" />
                Rozpocznij teraz
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </button>

        {/* Weak spots */}
        <WeakSpotsSection />

        {/* Recent attempts with playback */}
        <RecentAttemptsSection />

        {/* Filters — one line on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {DRILL_CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition-all",
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

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
              Trudność
            </span>
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-surface">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = difficulties.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Trudność ${n}`}
                    aria-pressed={active}
                    onClick={() =>
                      setDifficulties((prev) =>
                        prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort(),
                      )
                    }
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center transition-all",
                      active
                        ? "bg-gradient-gold shadow-elegant"
                        : "hover:bg-background/50",
                    )}
                  >
                    <Star
                      className={cn(
                        "h-3 w-3",
                        active
                          ? "fill-accent-foreground text-accent-foreground"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {difficulties.length > 0 && (
              <button
                type="button"
                onClick={() => setDifficulties([])}
                className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Grid — denser, 4 columns on desktop */}
        {drills.length === 0 ? (
          <div className="card-premium p-8 text-center max-w-md mx-auto">
            <Flame className="h-7 w-7 text-primary mx-auto mb-3" />
            <p className="font-display text-lg mb-1">Brak ćwiczeń w tej kategorii.</p>
            <p className="text-sm text-muted-foreground mb-5">Poluzuj filtry i spróbuj ponownie.</p>
            <Button
              variant="ghost-dark"
              size="sm"
              onClick={() => {
                setCategory("Wszystkie");
                setDifficulties([]);
              }}
            >
              Resetuj filtry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {drills.map((d) => (
              <DrillCard key={d.id} drill={d} onOpen={() => navigate(`/drills/${d.id}`)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DrillCard({ drill: d, onOpen }: { drill: Drill; onOpen: () => void }) {
  const earned = d.completed ? scoreToStars(d.previousScore) : 0;
  return (
    <div
      onClick={onOpen}
      className="tap-press card-premium p-4 flex flex-col cursor-pointer relative hover:-translate-y-0.5 hover:shadow-glow transition-all"
    >
      {d.completed && (
        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gradient-gold flex items-center justify-center shadow-elegant">
          <Check className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={3} />
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
          {d.category}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-accent">+{d.xp} XP</span>
      </div>

      {/* Angry stars for prior score */}
      <div className="mb-2 h-6 flex items-center">
        <AngryStars earned={earned} size="sm" />
      </div>

      <h3 className="font-display text-base leading-tight mb-1.5 line-clamp-2">{d.title}</h3>
      <p className="text-[11px] text-muted-foreground mb-3 line-clamp-1">{d.description}</p>

      <div className="mt-auto flex items-center justify-between">
        <div
          className="inline-flex items-center gap-0.5"
          aria-label={`Trudność ${d.difficulty} z 5`}
          title={`Trudność ${d.difficulty}/5`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-3 rounded-full",
                i < d.difficulty ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Rozpocznij"
          className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elegant hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <Play className="h-4 w-4 translate-x-[1px]" />
        </button>
      </div>
    </div>
  );
}
