export type SentenceLabel = 'critical' | 'weak' | 'good' | 'excellent';

export interface SentenceAnalysis {
  index: number;
  text: string;
  start_seconds: number;
  end_seconds: number;
  score: number;
  label: SentenceLabel;
  mentor_commentary: string;
  alternative: string;
  explanation: string;
}

export interface AltMentorPerspective {
  mentor_id: string;
  mentor_name: string;
  sentences: SentenceAnalysis[];
}

export interface LabelStyle {
  bg: string;
  border: string;
  icon: string;
  text: string;
  hex: string;
}

export const LABEL_COLORS: Record<SentenceLabel, LabelStyle> = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    icon: '!!',
    text: 'Krytyczny błąd',
    hex: '#ef4444',
  },
  weak: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500',
    icon: '?',
    text: 'Słabe',
    hex: '#eab308',
  },
  good: {
    bg: 'bg-green-500/10',
    border: 'border-green-500',
    icon: '✓',
    text: 'Dobre',
    hex: '#22c55e',
  },
  excellent: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    icon: '★',
    text: 'Mistrzowskie',
    hex: '#10b981',
  },
};
