import { getRandomScenario, SparringCategory } from '@/data/sparring/scenarios';

export function useScenarioRandom() {
  const getScenario = (category?: SparringCategory, level?: 1 | 2 | 3) => {
    return getRandomScenario(category, level);
  };

  return { getScenario };
}
