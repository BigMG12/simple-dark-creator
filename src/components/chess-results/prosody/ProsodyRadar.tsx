import { useMemo } from 'react';

interface Props {
  radar: Record<string, number>;
}

const DIMENSIONS = [
  { key: 'confidence', label: 'Pewność', color: '#10b981' },
  { key: 'excitement', label: 'Energia', color: '#f59e0b' },
  { key: 'determination', label: 'Determinacja', color: '#3b82f6' },
  { key: 'calmness', label: 'Spokój', color: '#8b5cf6' },
  { key: 'doubt', label: 'Niepewność', color: '#ef4444' },
  { key: 'tiredness', label: 'Zmęczenie', color: '#6b7280' },
  { key: 'awkwardness', label: 'Niezręczność', color: '#dc2626' },
  { key: 'boredom', label: 'Znudzenie', color: '#9ca3af' },
];

export function ProsodyRadar({ radar }: Props) {
  const points = useMemo(() => {
    const size = 200;
    const center = size / 2;
    const radius = size * 0.4;
    return DIMENSIONS.map((dim, i) => {
      const angle = (Math.PI * 2 * i) / DIMENSIONS.length - Math.PI / 2;
      const value = radar[dim.key] || 0;
      const r = (value / 100) * radius;
      return {
        ...dim,
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
        value,
      };
    });
  }, [radar]);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ') + ' Z';

  return (
    <div className="bg-card/50 rounded-xl p-6 border border-border/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">
            Voice Intelligence
          </div>
          <h3 className="font-display text-xl">Twój głos w tej sesji</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0">
          {[20, 40, 60, 80, 100].map((pct) => (
            <circle
              key={pct}
              cx="100"
              cy="100"
              r={(80 * pct) / 100}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity={0.3}
            />
          ))}
          {DIMENSIONS.map((_, i) => {
            const angle = (Math.PI * 2 * i) / DIMENSIONS.length - Math.PI / 2;
            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={100 + Math.cos(angle) * 80}
                y2={100 + Math.sin(angle) * 80}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity={0.3}
              />
            );
          })}
          <defs>
            <radialGradient id="radarGradient">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <path
            d={pathD}
            fill="url(#radarGradient)"
            stroke="#f59e0b"
            strokeWidth="2"
            opacity={0.85}
          />
          {points.map((p) => (
            <circle
              key={p.key}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={p.color}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs flex-1">
          {points.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-mono font-medium ml-auto">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
