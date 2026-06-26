import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  /** Ukryj wewnętrzny tekst (score/verdict) — np. dla małych sticky ringów. */
  hideLabels?: boolean;
}

function verdictFor(score: number) {
  if (score >= 90) return "Elita";
  if (score >= 75) return "Ostry";
  if (score >= 60) return "Rosnący";
  return "Surowy";
}

export function ScoreRing({ score, size = 280, stroke = 14, hideLabels = false }: ScoreRingProps) {
  const [display, setDisplay] = useState(0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(score);
      return;
    }
    const duration = 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full bg-gradient-primary opacity-20 blur-3xl"
        aria-hidden
      />
      {/* Slow orbiting glow halo */}
      <div
        aria-hidden
        className="absolute inset-[-12%] rounded-full animate-orbit-glow motion-reduce:hidden"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.45) 60deg, transparent 140deg)",
          filter: "blur(28px)",
          opacity: 0.55,
        }}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 80ms linear", filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.6))" }}
        />
      </svg>
      {!hideLabels && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-7xl md:text-8xl text-foreground tabular-nums leading-none">
            {display}
          </div>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            na 100
          </div>
          <div className="mt-3 font-display text-2xl text-gradient-primary">{verdictFor(score)}</div>
        </div>
      )}
    </div>
  );
}
