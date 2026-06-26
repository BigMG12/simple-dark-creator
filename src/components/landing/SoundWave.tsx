const BARS = 18;

const SoundWave = () => {
  return (
    <div
      className="flex h-64 items-center justify-center gap-1.5 sm:h-80"
      aria-hidden="true"
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const heights = ["h-12", "h-20", "h-32", "h-48", "h-40", "h-24", "h-16"];
        const h = heights[i % heights.length];
        const delay = `${(i * 90) % 1200}ms`;
        return (
          <span
            key={i}
            className={`w-1.5 origin-center rounded-full bg-gradient-primary ${h} animate-wave-bar`}
            style={{ animationDelay: delay }}
          />
        );
      })}
    </div>
  );
};

export default SoundWave;
