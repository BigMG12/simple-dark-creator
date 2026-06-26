import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  targetRange: [number, number];
  previousAvg: number | null;
  personalBest: number | null;
  interpretation: string;
  delta: number | null;
  status: 'excellent' | 'good' | 'needs_work' | 'critical';
  examples?: string[];
}

const STATUS_CONFIG = {
  excellent: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  good: {
    icon: CheckCircle2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  needs_work: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  critical: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

export function MetricCard({
  label,
  value,
  targetRange,
  previousAvg,
  personalBest,
  interpretation,
  delta,
  status,
  examples,
}: MetricCardProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const getTrendIcon = () => {
    if (delta === null) return Minus;
    if (delta > 0) return TrendingUp;
    if (delta < 0) return TrendingDown;
    return Minus;
  };

  const TrendIcon = getTrendIcon();
  const hasValue = typeof value === "number" && Number.isFinite(value) && value > 0;
  const displayValue = hasValue ? value : "—";

  return (
    <div className={`card-premium p-5 border-2 ${config.borderColor} ${config.bgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            {label}
          </div>
          <div className={`font-display text-4xl ${hasValue ? "" : "text-muted-foreground/60"}`}>
            {displayValue}
          </div>
        </div>
        <div className={`h-10 w-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
          <StatusIcon className={`h-5 w-5 ${config.color}`} />
        </div>
      </div>

      {/* Target range */}
      <div className="text-xs text-muted-foreground mb-3">
        Cel: {targetRange[0]}–{targetRange[1]}
      </div>

      {/* Interpretation */}
      <p className="text-sm text-foreground/80 leading-relaxed mb-4">
        {interpretation}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs">
        {delta !== null && (
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-3 w-3 ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
            <span className="text-muted-foreground">
              {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs poprzednia
            </span>
          </div>
        )}
        {personalBest !== null && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">PB: {personalBest}</span>
          </div>
        )}
      </div>

      {/* Examples (dla fillerów) */}
      {examples && examples.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Znalezione
          </div>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs font-mono"
              >
                {ex}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
