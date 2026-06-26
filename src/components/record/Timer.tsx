interface TimerProps {
  seconds: number;
  className?: string;
}

export function Timer({ seconds, className }: TimerProps) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return (
    <div className={`font-mono text-5xl md:text-6xl tracking-widest text-foreground ${className ?? ""}`}>
      {m}:{s}
    </div>
  );
}
