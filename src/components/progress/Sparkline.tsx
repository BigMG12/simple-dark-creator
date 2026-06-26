interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  invert?: boolean;
}

export function Sparkline({ data, width = 120, height = 36, invert = false }: SparklineProps) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((v, i) => {
    const norm = (v - min) / range;
    const y = invert ? norm * height : height - norm * height;
    return [i * stepX, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-9" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
