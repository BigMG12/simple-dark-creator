import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ExerciseContextData, ExercisePhase } from '@/lib/exerciseTypes';

interface ExerciseContextValue {
  current: ExerciseContextData | null;
  setCurrent: (ctx: ExerciseContextData | null) => void;

  phase: ExercisePhase;
  setPhase: (phase: ExercisePhase) => void;

  recordingBlob: Blob | null;
  setRecordingBlob: (blob: Blob | null) => void;

  elapsedSeconds: number;
  setElapsedSeconds: (s: number) => void;

  reset: () => void;
}

const ExerciseCtx = createContext<ExerciseContextValue | undefined>(undefined);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ExerciseContextData | null>(null);
  const [phase, setPhase] = useState<ExercisePhase>('preview');
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const reset = () => {
    setCurrent(null);
    setPhase('preview');
    setRecordingBlob(null);
    setElapsedSeconds(0);
  };

  return (
    <ExerciseCtx.Provider value={{
      current, setCurrent,
      phase, setPhase,
      recordingBlob, setRecordingBlob,
      elapsedSeconds, setElapsedSeconds,
      reset,
    }}>
      {children}
    </ExerciseCtx.Provider>
  );
}

export function useExercise() {
  const ctx = useContext(ExerciseCtx);
  if (!ctx) throw new Error('useExercise must be inside ExerciseProvider');
  return ctx;
}
