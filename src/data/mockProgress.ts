// Stub type definitions for legacy progress mock data.
// Real data now flows through /hooks/queries/* — these types remain so
// the presentation components keep their typed shape.

export interface HeatmapDay {
  date: string;
  sessions?: number;
  avgScore?: number;
  [key: string]: any;
}

export interface RadarMetrics {
  wpm: number;
  clarity: number;
  energy: number;
  pause: number;
  vocab: number;
  filler: number;
}

export interface ComparatorRecording {
  id: string;
  date: string;
  topic?: string;
  score: number;
  metrics: RadarMetrics;
}
