import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Target, ChevronRight } from "lucide-react";
import { useProgressData } from "@/hooks/queries/useProgressData";
import { drillsForMetric, pickWeakMetrics } from "@/lib/drillMatching";
import { Button } from "@/components/ui/button";

/**
 * Reads the user's current skill radar and surfaces 2 weakest metrics
 * with a direct link to a matching drill. Hidden when there is no data.
 */
export function WeakSpotsSection() {
  const navigate = useNavigate();
  const { data, isLoading } = useProgressData("30d");

  const weakSpots = useMemo(() => {
    if (!data) return [];
    return pickWeakMetrics(data.radar.current as any, 2);
  }, [data]);

  if (isLoading || weakSpots.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl md:text-2xl">
          Do <span className="text-gradient-primary">poprawy</span>
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Twoje 2 słabe punkty
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {weakSpots.map((m) => {
          const suggested = drillsForMetric(m, 1)[0];
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => suggested && navigate(`/drills/${suggested.id}`)}
              className="tap-press card-premium p-4 text-left flex items-center gap-4 group"
            >
              <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
                <Target className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                    {m.category}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    · {Math.round(m.score)}/100
                  </span>
                </div>
                <div className="font-display text-base leading-tight truncate">{m.label}</div>
                <p className="text-xs text-muted-foreground line-clamp-1">{m.hint}</p>
              </div>
              {suggested && (
                <Button
                  variant="ghost-dark"
                  size="sm"
                  className="shrink-0 group-hover:translate-x-0.5 transition-transform"
                  tabIndex={-1}
                >
                  Trenuj
                  <ChevronRight />
                </Button>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
