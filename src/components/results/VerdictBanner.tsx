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
    <div className={`card-premium p-6 md:p-8 bg-gradient-to-br ${config.gradient} border-2`} style={{ borderColor: accentColor }}>
      <div className="flex items-center gap-4 mb-3">
        <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <Icon className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            Werdykt
          </div>
          <h2 className={`font-display text-3xl md:text-4xl ${config.textColor}`}>
            {label}
          </h2>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono text-xs text-muted-foreground mb-1">Score</div>
          <div className="font-display text-4xl" style={{ color: accentColor }}>
            {score}
          </div>
        </div>
      </div>
      <p className="text-foreground/80 text-sm md:text-base">
        {config.description}
      </p>
    </div>
  );
}
