import { cn } from "@/lib/utils";

export interface TimelineEvent {
  timestamp: number;
  type: string;
  label: string;
  snippet: string;
}

const EVENT_COLOR: Record<string, string> = {
  objection: "hsl(var(--destructive))",
  close: "hsl(var(--primary))",
  interruption: "hsl(var(--accent))",
  question: "hsl(var(--category-authority))",
  anchor: "hsl(var(--category-sales))",
  concession: "hsl(var(--category-influence))",
  moment: "hsl(var(--success))",
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface Props {
  events: TimelineEvent[];
  durationSec: number;
  accentColor: string;
  onJump: (timestamp: number) => void;
}

/**
 * Chess-style pionowa oś kluczowych momentów rozmowy z mini-mapą jakości u góry.
 */
export function ConversationTimeline({ events, durationSec, accentColor, onJump }: Props) {
  if (!events.length) return null;
  const safeDuration = Math.max(durationSec, 1);

  return (
    <div className="card-brutal p-6 md:p-8 relative" style={{ borderLeftColor: accentColor }}>
      {/* Mini-mapa */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Mapa momentów
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {events.length} wydarzeń · {fmt(safeDuration)}
          </div>
        </div>
        <div className="relative h-9 rounded-md bg-muted/30 border border-border/60 overflow-hidden">
          {events.map((e, i) => {
            const left = Math.min(100, Math.max(0, (e.timestamp / safeDuration) * 100));
            const color = EVENT_COLOR[e.type] || accentColor;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onJump(e.timestamp)}
                title={`${fmt(e.timestamp)} · ${e.label}`}
                className="absolute top-0 bottom-0 w-[3px] -translate-x-1/2 hover:w-[6px] transition-all"
                style={{ left: `${left}%`, background: color }}
              />
            );
          })}
        </div>
      </div>

      {/* Pionowa oś */}
      <ol className="relative border-l-2 border-border/60 pl-6 space-y-4">
        {events.map((e, i) => {
          const color = EVENT_COLOR[e.type] || accentColor;
          return (
            <li key={i} className="relative">
              <span
                aria-hidden
                className="absolute -left-[31px] top-2 h-3 w-3 rounded-full ring-4 ring-background"
                style={{ background: color }}
              />
              <button
                type="button"
                onClick={() => onJump(e.timestamp)}
                className={cn(
                  "text-left w-full rounded-lg border border-border/60 bg-surface/60 p-4",
                  "hover:border-primary/50 hover:bg-surface transition-colors tap-press",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {fmt(e.timestamp)}
                  </span>
                  <span className="opacity-40 text-xs">·</span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.3em]"
                    style={{ color }}
                  >
                    {e.type}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1 text-foreground">{e.label}</p>
                {e.snippet && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{e.snippet}"
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
