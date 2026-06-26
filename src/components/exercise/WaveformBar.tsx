import { useEffect, useState } from "react";

interface WaveformBarProps {
  active?: boolean;
  bars?: number;
}

export default function WaveformBar({ active = true, bars = 32 }: WaveformBarProps) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: bars }, () => 0.2),
  );

  useEffect(() => {
    if (!active) {
      setHeights(Array.from({ length: bars }, () => 0.15));
      return;
    }
    const id = setInterval(() => {
      setHeights(Array.from({ length: bars }, () => 0.15 + Math.random() * 0.85));
    }, 120);
    return () => clearInterval(id);
  }, [active, bars]);

  return (
    <div className="flex h-16 items-center justify-center gap-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-gradient-primary transition-all duration-100"
          style={{ height: `${h * 100}%`, opacity: active ? 1 : 0.3 }}
        />
      ))}
    </div>
  );
}
