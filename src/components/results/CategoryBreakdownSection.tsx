import { CATEGORY_BY_ID, type CategoryId } from "@/data/categories";
import type { CategoryBreakdown, CategoryTile } from "@/data/mockResults";

interface Props {
  category: CategoryId;
  mentorName: string;
  mentorMonogram: string;
  breakdown: CategoryBreakdown;
}

function formatTile(tile: CategoryTile): string {
  if (tile.format === "score") return `${tile.value}`;
  if (tile.format === "boolean") return tile.value > 0 ? "Yes" : "No";
  return `${tile.value}`;
}

function tileSuffix(tile: CategoryTile): string {
  if (tile.format === "score") return "/100";
  return "";
}

export function CategoryBreakdownSection({
  category,
  mentorName,
  mentorMonogram,
  breakdown,
}: Props) {
  const cat = CATEGORY_BY_ID[category];
  const Icon = cat.icon;
  const accent = `hsl(var(--${cat.accentVar}))`;
  const gradient = `var(--${cat.gradientVar})`;
  const accentSoft = `hsl(var(--${cat.accentVar}) / 0.08)`;
  const accentBorder = `hsl(var(--${cat.accentVar}) / 0.3)`;

  const promptText = breakdown.alternativePrompt.replace("{mentor}", mentorName);

  return (
    <section className="space-y-4">
      {/* Section header with category accent */}
      <div className="flex items-center gap-2.5">
        <span
          className="h-7 w-7 rounded-md flex items-center justify-center shadow-elegant"
          style={{ background: gradient, color: "hsl(var(--primary-foreground))" }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            {cat.name} Lens
          </div>
          <h2 className="font-display text-xl md:text-2xl leading-tight">{breakdown.title}</h2>
        </div>
      </div>

      {/* 4 tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {breakdown.tiles.map((tile, i) => {
          const isScore = tile.format === "score";
          const fillPct = isScore ? Math.max(0, Math.min(100, tile.value)) : null;
          return (
            <div
              key={i}
              className="card-premium p-4 md:p-5 relative overflow-hidden"
              style={{
                background: accentSoft,
              }}
            >
              {/* Accent corner glow */}
              <div
                className="absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-50 pointer-events-none"
                style={{ background: accent }}
                aria-hidden
              />
              <div className="relative">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 leading-tight">
                  {tile.label}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="font-mono text-3xl md:text-4xl tabular-nums font-bold"
                    style={{ color: accent }}
                  >
                    {formatTile(tile)}
                  </span>
                  {tileSuffix(tile) && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {tileSuffix(tile)}
                    </span>
                  )}
                </div>
                {tile.detail && (
                  <div className="font-mono text-[10px] text-muted-foreground">{tile.detail}</div>
                )}
                {fillPct !== null && (
                  <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${fillPct}%`, background: gradient }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mentor alternative quote */}
      <div
        className="rounded-xl p-5 md:p-6 border flex gap-4"
        style={{ background: accentSoft, borderColor: accentBorder }}
      >
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center font-mono text-sm font-bold shrink-0 shadow-elegant"
          style={{ background: gradient, color: "hsl(var(--primary-foreground))" }}
        >
          {mentorMonogram}
        </div>
        <div className="min-w-0">
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-2"
            style={{ color: accent }}
          >
            {promptText}
          </div>
          <p className="italic text-foreground/90 leading-relaxed text-sm md:text-base">
            {breakdown.alternativeLine}
          </p>
        </div>
      </div>
    </section>
  );
}
