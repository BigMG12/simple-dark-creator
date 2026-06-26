import type { RadarMetrics } from "@/data/mockProgress";

const AXES: { key: keyof RadarMetrics; label: string }[] = [
  { key: "wpm", label: "WPM" },
  { key: "clarity", label: "Clarity" },
  { key: "energy", label: "Energy" },
  { key: "pause", label: "Pause" },
  { key: "vocab", label: "Vocab" },
  { key: "filler", label: "Filler Ctrl" },
];

interface Props {
  current: RadarMetrics;
  previous: RadarMetrics;
  size?: number;
}

export function SkillRadar({ current, previous, size = 320 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const rings = 4;

  const angle = (i: number) => (Math.PI * 2 * i) / AXES.length - Math.PI / 2;

  const point = (value: number, i: number) => {
    const r = (value / 100) * radius;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };

  const polygon = (vals: RadarMetrics) =>
    AXES.map(({ key }, i) => point(vals[key], i).join(",")).join(" ");

  const labelPos = (i: number) => {
    const r = radius + 22;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px] h-auto">
        <defs>
          <linearGradient id="radar-fire" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="radar-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Concentric rings */}
        {Array.from({ length: rings }, (_, r) => {
          const ringR = (radius * (r + 1)) / rings;
          const pts = AXES.map((_, i) => {
            const a = angle(i);
            return `${cx + ringR * Math.cos(a)},${cy + ringR * Math.sin(a)}`;
          }).join(" ");
          return (
            <polygon
              key={r}
              points={pts}
              fill="none"
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          );
        })}

        {/* Spokes */}
        {AXES.map((_, i) => {
          const [x, y] = point(100, i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          );
        })}

        {/* Previous (gold dashed) */}
        <polygon
          points={polygon(previous)}
          fill="url(#radar-gold)"
          stroke="hsl(var(--accent))"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeOpacity={0.8}
        />

        {/* Current (fire) */}
        <polygon
          points={polygon(current)}
          fill="url(#radar-fire)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />

        {/* Vertices */}
        {AXES.map(({ key }, i) => {
          const [x, y] = point(current[key], i);
          return <circle key={i} cx={x} cy={y} r={3} fill="hsl(var(--primary-glow))" />;
        })}

        {/* Labels */}
        {AXES.map(({ label }, i) => {
          const [x, y] = labelPos(i);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
            >
              {label}
            </text>
          );
        })}
      </svg>

      <div className="flex items-center gap-6 mt-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-sm bg-gradient-primary" />
          <span className="text-muted-foreground">Current</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-4 rounded-sm border border-dashed"
            style={{ borderColor: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.2)" }}
          />
          <span className="text-muted-foreground">Previous</span>
        </div>
      </div>
    </div>
  );
}
