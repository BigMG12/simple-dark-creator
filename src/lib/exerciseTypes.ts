export type ExerciseType = 'drill' | 'impromptu' | 'custom' | 'sparring';

export type ExercisePhase =
  | 'preview'
  | 'preparing'
  | 'recording'
  | 'analyzing'
  | 'complete';

export type WeaknessType =
  | 'fillers'
  | 'pace'
  | 'energy'
  | 'pauses'
  | 'clarity'
  | 'general';

export interface ExerciseStep {
  order: number;
  type: ExerciseType;
  drill_id?: string;
  topic?: string;
  duration_seconds?: number;
  reason: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  status: 'active' | 'completed' | 'abandoned';
  exercise_count: number;
  completed_exercises: number;
  current_exercise_index: number;
  weakness_focus: WeaknessType;
  exercise_sequence: ExerciseStep[];
  recording_ids: string[];
  total_xp_earned: number;
  average_score: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface ExerciseContextData {
  type: ExerciseType;
  drillId?: string;
  topic?: string;
  durationSeconds: number;
  sessionId?: string;
  stepOrder?: number;
}
