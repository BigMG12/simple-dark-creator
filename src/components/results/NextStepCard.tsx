import { Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NextStepCardProps {
  drillRecommendationReason: string;
  mentorPushToAction: string;
  accentColor: string;
  onStartDrill?: () => void;
}

export function NextStepCard({
  drillRecommendationReason,
  mentorPushToAction,
  accentColor,
  onStartDrill,
}: NextStepCardProps) {
  return (
    <div className="card-premium p-6 md:p-8 bg-gradient-to-br from-primary/10 to-accent/10 border-2" style={{ borderColor: accentColor }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <Target className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            Następny krok
          </div>
          <h3 className="font-display text-2xl">Twoje ćwiczenie</h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Why this drill */}
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Dlaczego to ćwiczenie
          </div>
          <p className="text-foreground/90 leading-relaxed">{drillRecommendationReason}</p>
        </div>

        {/* Push to action */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
          <p className="text-lg font-semibold leading-relaxed" style={{ color: accentColor }}>
            💪 {mentorPushToAction}
          </p>
        </div>

        {/* CTA */}
        {onStartDrill && (
          <Button
            size="lg"
            className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 font-semibold shadow-elegant hover:-translate-y-0.5 transition-all"
            onClick={onStartDrill}
          >
            Rozpocznij ćwiczenie
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
