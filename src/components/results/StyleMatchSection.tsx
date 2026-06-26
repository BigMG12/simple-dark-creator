import { useEffect, useState } from "react";
import { CATEGORY_BY_ID, type CategoryId } from "@/data/categories";
import type { StyleMatch } from "@/data/mockResults";

interface Props {
  styleMatch: StyleMatch;
  mentorName: string;
  category: CategoryId;
}

export function StyleMatchSection({ styleMatch, mentorName, category }: Props) {
  const cat = CATEGORY_BY_ID[category];
  const accent = `hsl(var(--${cat.accentVar}))`;
  const gradient = `var(--${cat.gradientVar})`;

  // Animate bars in on mount
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className="card-premium p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.3em] mb-2"
            style={{ color: accent }}
          >
            Style Match
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-5xl md:text-6xl tabular-nums font-bold"
              style={{ color: accent }}
            >
              {styleMatch.overall}
            </span>
            <span className="font-mono text-xl text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            How closely your delivery matches{" "}
            <span className="text-foreground font-medium">{mentorName}</span>'s signature style.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {styleMatch.dimensions.map((dim, i) => {
          const width = revealed ? dim.value : 0;
          return (
            <div key={dim.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-foreground/90">{dim.label}</span>
                <span
                  className="font-mono text-xs tabular-nums font-medium"
                  style={{ color: accent }}
                >
                  {dim.value}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${width}%`,
                    background: gradient,
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
