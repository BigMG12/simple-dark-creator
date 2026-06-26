import { Lightbulb } from "lucide-react";

interface HowToFixProps {
  insteadOf: string;
  sayThis: string;
  whyThisWorks: string;
  accentColor: string;
}

export function HowToFix({
  insteadOf,
  sayThis,
  whyThisWorks,
  accentColor,
}: HowToFixProps) {
  return (
    <div className="card-premium p-6 md:p-8 border-l-4" style={{ borderLeftColor: accentColor }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
          <Lightbulb className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            Jak to naprawić
          </div>
          <h3 className="font-display text-2xl">Konkretna recepta</h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Instead of */}
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Zamiast tego ❌
          </div>
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-foreground/80 line-through italic">"{insteadOf}"</p>
          </div>
        </div>

        {/* Say this */}
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Powiedz to ✅
          </div>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-green-400 font-semibold">"{sayThis}"</p>
          </div>
        </div>

        {/* Why this works */}
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Dlaczego to działa
          </div>
          <p className="text-foreground/90 leading-relaxed">{whyThisWorks}</p>
        </div>
      </div>
    </div>
  );
}
