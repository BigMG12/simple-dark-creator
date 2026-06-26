export type GoalType = "score" | "metric" | "activity" | "mentor" | "conversation";

export interface GoalDraft {
  type: GoalType;
  metricKey?: string;
  mode?: "average" | "peak";
  targetValue: number;
  unit?: string;
  mentorId?: string;
  deadline: string;
  title: string;
  description?: string;
}

export type ComparatorRecording = {
  id: string;
  date: string;
  score: number;
  metrics: { wpm: number; clarity: number; energy: number; pause: number; vocab: number; filler: number };
};
