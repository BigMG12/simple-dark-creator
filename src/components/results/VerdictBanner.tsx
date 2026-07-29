import { Trophy, TrendingUp, Target, Flame } from "lucide-react";

interface VerdictBannerProps {
  label: "Surowy" | "Solidny" | "Mocny" | "Mistrzowski";
  score: number;
  accentColor: string;
}

const VERDICT_CONFIG = {
  Surowy: {
    icon: Flame,
    gradient: "from-red-500/20 to-orange-500/20",
    textColor: "text-red-400",
    description: "Sporo do poprawy, ale każdy mistrz kiedyś zaczynał",
  },
  Solidny: {
    icon: Target,
    gradient: "from-yellow-500/20 to-amber-500/20",
    textColor: "text-yellow-400",
    description: "Solidna podstawa. Teraz czas na szlif",
  },
  Mocny: {
    icon: TrendingUp,
    gradient: "from-blue-500/20 to-cyan-500/20",
    textColor: "text-blue-400",
    description: "Mocna forma. Jesteś blisko perfekcji",
  },
  Mistrzowski: {
    icon: Trophy,
    gradient: "from-purple-500/20 to-pink-500/20",
    textColor: "text-purple-400",
    description: "Mistrzowski poziom. To jest to",
  },
};

export function VerdictBanner({ label, score, accentColor }: VerdictBannerProps) {
  const config = VERDICT_CONFIG[label];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl p-3.5 md:p-4 bg-card/40 border flex items-center gap-3"
      style={{ borderColor: `${accentColor}40` }}
    >
      <div className="h-9 w-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
        <Icon className={`h-4 w-4 ${config.textColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            Werdykt
          </span>
          <h2 className={`font-display text-base md:text-lg ${config.textColor} leading-none`}>
            {label}
          </h2>
        </div>
        <p className="text-muted-foreground text-xs mt-0.5 truncate">
          {config.description}
        </p>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Score</div>
        <div className="font-display text-xl leading-none" style={{ color: accentColor }}>
          {score}
        </div>
      </div>
    </div>
  );
}
