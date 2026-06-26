interface Props {
  values: { wpm: number; clarity: number; energy: number; pause: number; vocab: number; filler: number };
  size?: number;
}

const AXES = [
  { key: "wpm", label: "WPM" },
  { key: "clarity", label: "Clr" },
  { key: "energy", label: "Eng" },
  { key: "pause", label: "Pse" },
  { key: "vocab", label: "Vcb" },
  { key: "filler", label: "Fil" },
] as const;

export function MiniSkillRadar({ values, size = 200 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const angle = (i: number) => (Math.PI * 2 * i) / AXES.length - Math.PI / 2;

  const point = (v: number, i: number) => {
    const r = (v / 100) * radius;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };

  const polygon = AXES.map(({ key }, i) => point(values[key], i).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[200px] h-auto">
      <defs>
        <linearGradient id="mini-radar-fire" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {[0.33, 0.66, 1].map((f) => {
        const r = radius * f;
        const pts = AXES.map((_, i) => `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`).join(" ");
        return <polygon key={f} points={pts} fill="none" stroke="hsl(var(--border))" strokeOpacity={0.4} />;
      })}

      {AXES.map((_, i) => {
        const [x, y] = point(100, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" strokeOpacity={0.4} />;
      })}

      <polygon points={polygon} fill="url(#mini-radar-fire)" stroke="hsl(var(--primary))" strokeWidth={1.5} />

      {AXES.map(({ label }, i) => {
        const r = radius + 14;
        const x = cx + r * Math.cos(angle(i));
        const y = cy + r * Math.sin(angle(i));
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, fontFamily: "ui-monospace, monospace" }}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
