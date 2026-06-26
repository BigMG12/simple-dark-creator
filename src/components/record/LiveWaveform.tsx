interface LiveWaveformProps {
  levels: number[];
}

export function LiveWaveform({ levels }: LiveWaveformProps) {
  return (
    <div className="flex items-end justify-center gap-1.5 h-48 md:h-64 w-full max-w-2xl mx-auto">
      {levels.map((v, i) => {
        const h = Math.max(4, v * 100);
        return (
          <div
            key={i}
            className="bg-gradient-primary rounded-full w-2 md:w-3 transition-[height] duration-75 shadow-glow"
            style={{ height: `${h}%`, opacity: 0.5 + v * 0.5 }}
          />
        );
      })}
    </div>
  );
}
