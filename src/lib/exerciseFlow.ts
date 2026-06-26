import type { ExercisePhase } from '@/lib/exerciseTypes';

const VALID_TRANSITIONS: Record<ExercisePhase, ExercisePhase[]> = {
  preview:   ['preparing'],
  preparing: ['recording', 'preview'],
  recording: ['analyzing', 'preview'],
  analyzing: ['complete', 'preview'],
  complete:  ['preview'],
};

export function canTransition(from: ExercisePhase, to: ExercisePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextPhase(current: ExercisePhase): ExercisePhase | null {
  const allowed = VALID_TRANSITIONS[current];
  return allowed?.[0] ?? null;
}

export function isTerminal(phase: ExercisePhase): boolean {
  return phase === 'complete';
}

export function phaseLabel(phase: ExercisePhase): string {
  const labels: Record<ExercisePhase, string> = {
    preview:   'Podgląd ćwiczenia',
    preparing: 'Przygotuj się...',
    recording: 'Nagrywanie',
    analyzing: 'Analiza...',
    complete:  'Gotowe!',
  };
  return labels[phase];
}
