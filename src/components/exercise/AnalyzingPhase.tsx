import { useEffect, useState } from "react";
import { Brain } from "lucide-react";

interface Props {
  onComplete?: () => void;
  durationMs?: number;
}

const STEPS = [
  "Transkrypcja nagrania…",
  "Analiza tempa i pauz…",
  "Wykrywanie słów-wypełniaczy…",
  "Ocena klarowności i energii…",
  "Składanie raportu…",
];

export default function AnalyzingPhase({ onComplete, durationMs = 4000 }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const tick = durationMs / STEPS.length;
    const intId = setInterval(() => {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }, tick);
    const doneId = setTimeout(() => onComplete?.(), durationMs);
    return () => {
      clearInterval(intId);
      clearTimeout(doneId);
    };
  }, [durationMs, onComplete]);

  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-surface ring-1 ring-primary/30 shadow-elegant">
          <Brain className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          AI analizuje Twoje nagranie
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Liczę liczby…
        </h2>
      </div>

      <ul className="space-y-2 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 transition-opacity ${
              i <= step ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                i < step ? "bg-emerald-400" : i === step ? "animate-pulse bg-primary" : "bg-muted"
              }`}
            />
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
