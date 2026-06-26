interface TimerCircleProps {
  elapsed: number;
  total: number;
  label?: string;
  size?: number;
}

export default function TimerCircle({ elapsed, total, label, size = 220 }: TimerCircleProps) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, elapsed / total) : 0;
  const offset = circumference * (1 - pct);
  const remaining = Math.max(0, total - elapsed);

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
          {mm}:{ss}
        </div>
        {label && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
