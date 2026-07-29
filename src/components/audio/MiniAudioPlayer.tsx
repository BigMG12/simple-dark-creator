import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimal audio player: play/pause + scrubber + time. */
export function MiniAudioPlayer({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  if (!src) {
    return (
      <div className={cn("text-xs text-muted-foreground italic", className)}>
        Nagranie niedostępne
      </div>
    );
  }

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
        setPlaying(true);
      } catch (e) {
        console.warn("[audio] play failed", e);
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const a = audioRef.current;
    if (a) a.currentTime = v;
    setCurrent(v);
  };

  return (
    <div className={cn("flex items-center gap-3 w-full", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elegant hover:scale-105 transition-transform"
        aria-label={playing ? "Pauza" : "Odtwórz"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={current}
        onChange={seek}
        className="flex-1 h-1 accent-primary cursor-pointer"
        aria-label="Postęp odtwarzania"
      />
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-14 text-right">
        {fmt(current)} / {fmt(duration)}
      </span>
    </div>
  );
}

function fmt(s: number) {
  if (!isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
