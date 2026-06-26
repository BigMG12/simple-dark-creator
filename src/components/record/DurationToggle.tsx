import { cn } from "@/lib/utils";
import { DURATIONS, type Duration } from "@/data/topics";

interface DurationToggleProps {
  value: Duration;
  onChange: (v: Duration) => void;
}

const LABELS: Record<Duration, string> = { 30: "30s", 60: "60s", 90: "90s", 180: "3min" };

export function DurationToggle({ value, onChange }: DurationToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface border border-border">
      {DURATIONS.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium font-mono transition-all",
              active
                ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}
