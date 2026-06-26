import { TrendingDown, TrendingUp } from "lucide-react";

interface WeakestStrongestBadgesProps {
  weakest: string;
  strongest: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  pace_wpm: "Tempo",
  fillers: "Fillery",
  pause_mastery: "Pauzy",
  energy_variance: "Energia",
  clarity: "Klarowność",
  vocabulary: "Słownictwo",
};

export function WeakestStrongestBadges({
  weakest,
  strongest,
}: WeakestStrongestBadgesProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Weakest */}
      <div className="flex-1 card-premium p-4 bg-red-500/5 border-2 border-red-500/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-0.5">
              Najsłabszy wymiar
            </div>
            <div className="font-display text-lg text-red-400">
              {DIMENSION_LABELS[weakest] || weakest}
            </div>
          </div>
        </div>
      </div>

      {/* Strongest */}
      <div className="flex-1 card-premium p-4 bg-green-500/5 border-2 border-green-500/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-0.5">
              Najmocniejszy wymiar
            </div>
            <div className="font-display text-lg text-green-400">
              {DIMENSION_LABELS[strongest] || strongest}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
