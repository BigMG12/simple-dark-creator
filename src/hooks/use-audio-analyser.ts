import { useEffect, useRef, useState } from "react";

export function useAudioAnalyser(stream: MediaStream | null, bars: number = 48) {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0));
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / bars) || 1;
      const next: number[] = [];
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] ?? 0;
        next.push(v / 255);
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        src.disconnect();
        analyser.disconnect();
        ctx.close();
      } catch {}
    };
  }, [stream, bars]);

  return levels;
}
