/**
 * Rozklad oceny — pokazuje 6 wymiarow twardego score (0-100)
 * plus mentor delta. Wszystko przezroczyste: uzytkownik widzi
 * DLACZEGO dostal 78 zamiast 72.
 */
interface Breakdown {
  fluency: number;
  structure: number;
  vocabulary: number;
  pauses: number;
  prosody: number;
  mentor_match: number;
  weighted: number;
}

interface Props {
  breakdown: Breakdown;
  hardScore: number;
  mentorDelta: number;
  finalScore: number;
  accentColor: string;
}

const DIMENSIONS: Array<{ key: keyof Breakdown; label: string; weight: number }> = [
  { key: 'fluency',      label: 'Płynność',       weight: 25 },
  { key: 'structure',    label: 'Struktura',      weight: 20 },
  { key: 'vocabulary',   label: 'Słownictwo',     weight: 15 },
  { key: 'pauses',       label: 'Pauzy',          weight: 15 },
  { key: 'prosody',      label: 'Prozodia',       weight: 15 },
  { key: 'mentor_match', label: 'Match z mentorem', weight: 10 },
];

function scoreColor(score: number): string {
  if (score >= 85) return 'hsl(142 76% 55%)';
  if (score >= 65) return 'hsl(48 96% 60%)';
  if (score >= 40) return 'hsl(30 100% 60%)';
  return 'hsl(0 84% 60%)';
}

export function ScoreBreakdown({ breakdown, hardScore, mentorDelta, finalScore, accentColor }: Props) {
  const deltaSign = mentorDelta > 0 ? '+' : '';
  return (
    <div
      className="card-brutal p-5 md:p-7 space-y-5"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            Rozkład oceny
          </div>
          <h3 className="font-display text-xl md:text-2xl">Skąd wziął się Twój wynik</h3>
        </div>
        <div className="flex items-center gap-3 text-sm font-mono tabular-nums">
          <span className="text-muted-foreground">
            Twardy <span className="text-foreground">{hardScore}</span>
          </span>
          <span className="opacity-40">·</span>
          <span className="text-muted-foreground">
            Mentor <span style={{ color: accentColor }}>{deltaSign}{mentorDelta}</span>
          </span>
          <span className="opacity-40">→</span>
          <span
            className="font-display text-xl tabular-nums"
            style={{ color: accentColor }}
          >
            {finalScore}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {DIMENSIONS.map((d) => {
          const val = Math.round(breakdown[d.key] as number);
          const color = scoreColor(val);
          return (
            <div key={d.key} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-foreground/90">{d.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    waga {d.weight}%
                  </span>
                </div>
                <span
                  className="font-mono tabular-nums font-semibold"
                  style={{ color }}
                >
                  {val}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${val}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-3">
        Twardy wynik liczony jest z Twoich metryk (fillery, WPM, pauzy, słownictwo, prozodia).
        Mentor koryguje go o ±10 pkt w oparciu o Twój styl i kontekst wystąpienia.
      </p>
    </div>
  );
}
