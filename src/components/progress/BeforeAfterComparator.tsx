import { useMemo, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComparatorRecording } from "@/data/mockProgress";

interface Props {
  recordings: ComparatorRecording[];
  initialBefore: ComparatorRecording;
  initialAfter: ComparatorRecording;
}

const METRIC_ROWS: { key: keyof ComparatorRecording["metrics"]; label: string; invert?: boolean }[] = [
  { key: "wpm", label: "WPM" },
  { key: "clarity", label: "Clarity" },
  { key: "energy", label: "Energy Variance" },
  { key: "pause", label: "Pause Mastery" },
  { key: "vocab", label: "Vocabulary" },
  { key: "filler", label: "Filler Density", invert: true },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BeforeAfterComparator({ recordings, initialBefore, initialAfter }: Props) {
  const [beforeId, setBeforeId] = useState(initialBefore.id);
  const [afterId, setAfterId] = useState(initialAfter.id);

  const before = recordings.find((r) => r.id === beforeId) ?? initialBefore;
  const after = recordings.find((r) => r.id === afterId) ?? initialAfter;

  const rows = useMemo(() => {
    return METRIC_ROWS.map((row) => {
      const b = before.metrics[row.key];
      const a = after.metrics[row.key];
      const raw = a - b;
      const improved = row.invert ? raw < 0 : raw > 0;
      const magnitude = Math.min(100, Math.abs((raw / Math.max(b, 1)) * 100));
      return { ...row, b, a, improved, magnitude, raw };
    });
  }, [before, after]);

  const biggestKey = rows.reduce((best, r) => (r.magnitude > best.magnitude && r.improved ? r : best), rows[0]).key;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Then", rec: before, set: setBeforeId, id: beforeId },
          { label: "Now", rec: after, set: setAfterId, id: afterId },
        ].map((side) => (
          <div key={side.label} className="card-premium p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{side.label}</span>
              <span className="text-xs font-mono text-muted-foreground">{fmtDate(side.rec.date)}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-4xl text-foreground">{side.rec.score}</span>
              <span className="text-sm text-muted-foreground">overall</span>
            </div>
            <select
              value={side.id}
              onChange={(e) => side.set(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono"
            >
              {recordings.map((r) => (
                <option key={r.id} value={r.id}>
                  {fmtDate(r.date)} · {r.score}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="card-premium p-5 space-y-3">
        {rows.map((row) => {
          const isBig = row.key === biggestKey && row.improved;
          const barColor = row.improved ? (isBig ? "hsl(var(--accent))" : "hsl(var(--success))") : "hsl(var(--destructive))";
          return (
            <div key={String(row.key)} className="grid grid-cols-[110px_1fr_auto] gap-3 items-center">
              <span className={`text-sm ${isBig ? "text-accent font-semibold" : "text-muted-foreground"}`}>{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground w-10 text-right">{row.b}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm text-foreground w-10">{row.a}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${row.magnitude}%`, background: barColor, boxShadow: isBig ? `0 0 12px ${barColor}` : undefined }}
                  />
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground w-12 text-right">
                {row.raw > 0 ? "+" : ""}
                {row.raw}
              </span>
            </div>
          );
        })}
      </div>

      <Button variant="outline" className="w-full sm:w-auto">
        <Play className="h-4 w-4" /> Play both
      </Button>
    </div>
  );
}
