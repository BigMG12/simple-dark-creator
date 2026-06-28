import { SentenceAnalysis, LABEL_COLORS } from './types';

interface Props {
  sentences: SentenceAnalysis[];
  durationSeconds: number;
  selectedIndex: number | null;
  onSelectSentence: (index: number) => void;
}

export function QualityMiniMap({
  sentences,
  durationSeconds,
  selectedIndex,
  onSelectSentence,
}: Props) {
  if (sentences.length === 0) return null;

  const width = 600;
  const height = 100;
  const duration = Math.max(durationSeconds, 1);

  const points = sentences.map((s) => {
    const x = (s.start_seconds / duration) * width;
    const y = height - (s.score / 100) * height;
    return { x, y, sentence: s };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ');
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const totalMin = Math.floor(duration / 60);
  const totalSec = Math.floor(duration % 60);

  return (
    <div className="card-brutal p-5 md:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Mapa sesji
        </div>
        <div className="flex gap-3 text-[10px] font-mono">
          <Legend color="red" label="Krytyczne" />
          <Legend color="amber" label="Słabe" />
          <Legend color="green" label="Dobre" />
          <Legend color="emerald" label="Mistrzowskie" />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height + 20}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="qmm-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
          strokeWidth="1"
        />

        <path d={areaD} fill="url(#qmm-area)" />
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {points.map((p, i) => {
          const isSelected = selectedIndex === i;
          const fill = LABEL_COLORS[p.sentence.label].hex;
          return (
            <g
              key={i}
              onClick={() => onSelectSentence(i)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 7 : 4.5}
                fill={fill}
                stroke={isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--background))'}
                strokeWidth={isSelected ? 2 : 1.5}
              />
              {isSelected && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="hsl(var(--foreground))"
                >
                  {p.sentence.score}
                </text>
              )}
            </g>
          );
        })}

        <text x="0" y={height + 16} fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          0:00
        </text>
        <text
          x={width}
          y={height + 16}
          fontSize="9"
          fontFamily="monospace"
          fill="hsl(var(--muted-foreground))"
          textAnchor="end"
        >
          {totalMin}:{String(totalSec).padStart(2, '0')}
        </text>
      </svg>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
  };
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className={`inline-block w-2 h-2 rounded-full ${colorMap[color]}`} />
      {label}
    </div>
  );
}
