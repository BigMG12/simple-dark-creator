import { AngryStars } from "@/components/drills/AngryStars";

interface VerdictBannerProps {
  label: "Surowy" | "Solidny" | "Mocny" | "Mistrzowski";
  score: number;
  accentColor: string;
  hardScore?: number | null;
  mentorDelta?: number | null;
}

const VERDICT_CONFIG: Record<
  VerdictBannerProps["label"],
  { headline: string; sub: string; textClass: string }
> = {
  Surowy: {
    headline: "Nice Try!",
    sub: "Każdy mistrz kiedyś zaczynał",
    textClass: "text-red-400",
  },
  Solidny: {
    headline: "Level Cleared!",
    sub: "Solidna podstawa — czas na szlif",
    textClass: "text-yellow-300",
  },
  Mocny: {
    headline: "Great Job!",
    sub: "Mocna forma. Blisko perfekcji",
    textClass: "text-amber-300",
  },
  Mistrzowski: {
    headline: "Perfect!",
    sub: "Mistrzowski poziom. To jest to",
    textClass: "text-amber-200",
  },
};

/** 0–100 → 0–3 stars, Angry Birds style. */
function scoreToStars(score: number): number {
  if (score >= 85) return 3;
  if (score >= 65) return 2;
  if (score >= 40) return 1;
  return 0;
}

export function VerdictBanner({ label, score, accentColor, hardScore, mentorDelta }: VerdictBannerProps) {
  const config = VERDICT_CONFIG[label];
  const stars = scoreToStars(score);
  const showBreakdown =
    typeof hardScore === "number" &&
    typeof mentorDelta === "number" &&
    Number.isFinite(hardScore) &&
    Number.isFinite(mentorDelta);
  const deltaSign = (mentorDelta ?? 0) > 0 ? "+" : "";

  return (
    <div
      className="relative rounded-2xl overflow-hidden border bg-gradient-to-b from-background/80 to-surface/60 px-5 py-6 md:py-8 text-center"
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 blur-3xl opacity-40"
        style={{ background: `radial-gradient(closest-side, ${accentColor}, transparent)` }}
      />

      <div className="relative flex flex-col items-center gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Werdykt
        </div>
        <h2
          className={`font-display text-3xl md:text-4xl leading-none tracking-tight ${config.textClass}`}
          style={{ textShadow: "0 2px 12px rgba(255,180,0,0.35)" }}
        >
          {config.headline}
        </h2>

        <div className="my-1">
          <AngryStars earned={stars} size="lg" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Score
          </span>
          <span
            className="font-display text-2xl tabular-nums leading-none"
            style={{ color: accentColor }}
          >
            {score}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            · {label}
          </span>
        </div>

        <p className="text-xs md:text-sm text-muted-foreground max-w-xs">{config.sub}</p>

        {showBreakdown && (
          <div
            className="mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-widest"
            style={{ borderColor: `${accentColor}30`, color: accentColor }}
            title="Twardy score z metryk + korekta mentora"
          >
            <span className="text-muted-foreground">Twardy</span>
            <span className="tabular-nums text-foreground/90">{hardScore}</span>
            <span className="opacity-40">·</span>
            <span className="text-muted-foreground">Mentor</span>
            <span className="tabular-nums">{deltaSign}{mentorDelta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

