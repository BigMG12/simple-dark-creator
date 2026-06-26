import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  delta?: number;
  goodDirection?: "up" | "down";
  hint?: string;
  alert?: boolean;
}

export function MetricTile({
  label,
  value,
  unit,
  trend = "flat",
  delta = 0,
  goodDirection = "up",
  hint,
  alert,
}: MetricTileProps) {
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const isGood = trend === "flat" ? null : trend === goodDirection;
  const trendColor =
    isGood === null
      ? "text-muted-foreground"
      : isGood
      ? "text-success"
      : "text-destructive";

  return (
    <div className="card-premium p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={cn(
            "font-mono text-4xl tabular-nums leading-none",
            alert ? "text-destructive" : "text-foreground",
          )}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-center justify-between">
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <div className={cn("ml-auto inline-flex items-center gap-1 font-mono text-xs", trendColor)}>
          <Icon className="h-3.5 w-3.5" />
          {trend !== "flat" && (
            <span>
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
          {trend === "flat" && <span>stabilnie</span>}
        </div>
      </div>
    </div>
  );
}
