import { useState } from "react";
import type { HeatmapDay } from "@/data/mockProgress";

interface Props {
  days: HeatmapDay[];
}

function intensity(sessions: number) {
  if (sessions === 0) return 0;
  if (sessions === 1) return 0.3;
  if (sessions <= 3) return 0.6;
  return 1;
}

export function ActivityHeatmap({ days }: Props) {
  const [hover, setHover] = useState<HeatmapDay | null>(null);

  // Build columns of 7 (weeks)
  const cols: HeatmapDay[][] = [];
  let cur: HeatmapDay[] = [];
  days.forEach((d, i) => {
    cur.push(d);
    if (cur.length === 7 || i === days.length - 1) {
      cols.push(cur);
      cur = [];
    }
  });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-1 min-w-max">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((d) => {
                const a = intensity(d.sessions);
                const isHover = hover?.date === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onMouseEnter={() => setHover(d)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(d)}
                    onBlur={() => setHover(null)}
                    aria-label={`${d.date}: ${d.sessions} sessions`}
                    className="h-3 w-3 rounded-sm transition-all"
                    style={{
                      background: a === 0 ? "hsl(var(--surface))" : `hsl(var(--primary) / ${a})`,
                      boxShadow: a === 1 ? "0 0 8px hsl(var(--primary) / 0.6)" : undefined,
                      outline: isHover ? "1px solid hsl(var(--primary-glow))" : undefined,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span className="min-h-[18px]">
          {hover
            ? `${hover.sessions} session${hover.sessions === 1 ? "" : "s"}${hover.avgScore ? ` · avg ${hover.avgScore}` : ""} · ${new Date(hover.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "Hover to inspect"}
        </span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {[0, 0.3, 0.6, 1].map((a) => (
            <span
              key={a}
              className="h-3 w-3 rounded-sm"
              style={{
                background: a === 0 ? "hsl(var(--surface))" : `hsl(var(--primary) / ${a})`,
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
