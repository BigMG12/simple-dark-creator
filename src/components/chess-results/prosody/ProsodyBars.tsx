import type { ProsodyEmotionBar } from '../types';

interface Props {
  emotions: ProsodyEmotionBar[];
}

const EMOTION_COLORS: Record<string, string> = {
  Confidence: 'bg-green-500',
  Excitement: 'bg-amber-500',
  Determination: 'bg-blue-500',
  Calmness: 'bg-purple-500',
  Joy: 'bg-yellow-500',
  Enthusiasm: 'bg-orange-500',
  Satisfaction: 'bg-emerald-500',
  Triumph: 'bg-yellow-600',
  Doubt: 'bg-red-500',
  Tiredness: 'bg-gray-500',
  Awkwardness: 'bg-rose-500',
  Boredom: 'bg-slate-500',
  Anxiety: 'bg-red-600',
  Confusion: 'bg-orange-400',
  Disappointment: 'bg-gray-600',
  Embarrassment: 'bg-pink-500',
  Sadness: 'bg-blue-400',
  Anger: 'bg-red-700',
  Fear: 'bg-violet-600',
};

export function ProsodyBars({ emotions }: Props) {
  if (!emotions || emotions.length === 0) return null;

  return (
    <div className="space-y-2 mt-3 p-3 bg-card/50 rounded-lg border border-border/40">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
        Twój głos w tym momencie
      </div>
      {emotions.slice(0, 5).map((emotion) => (
        <div key={emotion.name} className="flex items-center gap-3">
          <div className="text-xs font-medium w-28 flex-shrink-0">
            {emotion.polish_name}
          </div>
          <div className="flex-1 bg-card rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                EMOTION_COLORS[emotion.name] || 'bg-primary'
              }`}
              style={{ width: `${emotion.score}%` }}
            />
          </div>
          <div className="text-xs font-mono w-10 text-right text-muted-foreground">
            {emotion.score}%
          </div>
        </div>
      ))}
    </div>
  );
}
