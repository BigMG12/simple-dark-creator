import { useEffect, useState } from 'react';

export function Waveform() {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(Array(20).fill(0).map(() => Math.random()));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-1 h-20">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-red-600 rounded-full transition-all duration-100"
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
}
