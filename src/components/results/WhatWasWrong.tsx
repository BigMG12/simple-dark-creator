import { AlertCircle } from "lucide-react";

interface WhatWasWrongProps {
  moment: string;
  diagnosis: string;
  whatClientThought: string;
  accentColor: string;
}

export function WhatWasWrong({
  moment,
  diagnosis,
  whatClientThought,
  accentColor,
}: WhatWasWrongProps) {
  const norm = (s: string) => s.replace(/^["'„""]+|["'„""]+$/g, "").trim().toLowerCase();
  // Jeśli "moment" jest tym samym co diagnoza — to nie jest moment, tylko duplikat.
  const showMoment = moment.trim().length > 0 && norm(moment) !== norm(diagnosis);
  const showThought = whatClientThought.trim().length > 0;

  return (
    <div className="card-premium p-6 md:p-8 border-l-4" style={{ borderLeftColor: accentColor }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
            Co poszło nie tak
          </div>
          <h3 className="font-display text-2xl">Diagnoza</h3>
        </div>
      </div>

      <div className="space-y-4">
        {showMoment && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Moment z sesji
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-foreground/90 italic">"{moment}"</p>
            </div>
          </div>
        )}

        {diagnosis.trim().length > 0 && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Diagnoza
            </div>
            <p className="text-foreground/90 leading-relaxed">{diagnosis}</p>
          </div>
        )}

        {showThought && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Co pomyślał klient
            </div>
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-red-400/90 leading-relaxed">💭 {whatClientThought}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
