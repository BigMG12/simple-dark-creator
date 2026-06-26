import { useEffect, useRef } from 'react';
import { useExercise } from '@/contexts/ExerciseContext';
import type { ExercisePhase } from '@/lib/exerciseTypes';

interface UseExerciseFlowOptions {
  preparationSeconds?: number;
  onPhaseChange?: (phase: ExercisePhase) => void;
}

export function useExerciseFlow(opts: UseExerciseFlowOptions = {}) {
  const {
    phase, setPhase,
    elapsedSeconds, setElapsedSeconds,
    current,
  } = useExercise();

  const { preparationSeconds = 5, onPhaseChange } = opts;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase !== 'preparing') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setElapsedSeconds(0);
    let counter = 0;

    intervalRef.current = setInterval(() => {
      counter += 1;
      setElapsedSeconds(counter);

      if (counter >= preparationSeconds) {
        clearInterval(intervalRef.current!);
        setPhase('recording');
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, preparationSeconds, setPhase, setElapsedSeconds]);

  useEffect(() => {
    if (phase !== 'recording' || !current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setElapsedSeconds(0);
    let counter = 0;
    const maxSeconds = current.durationSeconds;

    intervalRef.current = setInterval(() => {
      counter += 1;
      setElapsedSeconds(counter);

      if (counter >= maxSeconds) {
        clearInterval(intervalRef.current!);
        setPhase('analyzing');
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, current, setPhase, setElapsedSeconds]);

  return {
    phase,
    elapsedSeconds,
    remainingSeconds: phase === 'preparing'
      ? preparationSeconds - elapsedSeconds
      : phase === 'recording' && current
      ? current.durationSeconds - elapsedSeconds
      : 0,
    startPreparation: () => setPhase('preparing'),
    skipToRecording: () => setPhase('recording'),
    stopRecording: () => setPhase('analyzing'),
  };
}
