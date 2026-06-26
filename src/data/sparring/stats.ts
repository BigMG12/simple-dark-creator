import { SparringCategory } from './scenarios';

export interface CategoryStats {
  category: SparringCategory;
  last_score: number;
  average_score: number;
  total_sessions: number;
  best_score: number;
}

export const MOCKED_STATS: CategoryStats[] = [
  {
    category: 'price_objection',
    last_score: 65,
    average_score: 58,
    total_sessions: 12,
    best_score: 82,
  },
  {
    category: 'indecision',
    last_score: 72,
    average_score: 68,
    total_sessions: 8,
    best_score: 85,
  },
  {
    category: 'competition',
    last_score: 58,
    average_score: 62,
    total_sessions: 15,
    best_score: 78,
  },
  {
    category: 'anger',
    last_score: 45,
    average_score: 52,
    total_sessions: 6,
    best_score: 71,
  },
  {
    category: 'no_urgency',
    last_score: 68,
    average_score: 64,
    total_sessions: 10,
    best_score: 88,
  },
];

export function getStatsByCategory(category: SparringCategory): CategoryStats | undefined {
  return MOCKED_STATS.find(s => s.category === category);
}
