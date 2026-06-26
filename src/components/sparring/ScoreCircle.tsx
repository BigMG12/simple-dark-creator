import { cn } from '@/lib/utils';

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreCircle({ score, size = 'lg' }: ScoreCircleProps) {
  const sizeClasses = {
    sm: 'w-24 h-24 text-2xl',
    md: 'w-32 h-32 text-3xl',
    lg: 'w-40 h-40 text-4xl',
  };

  const getColor = (score: number) => {
    if (score < 55) return 'text-red-600';
    if (score < 70) return 'text-yellow-600';
    if (score < 85) return 'text-green-600';
    return 'text-yellow-500';
  };

  const getLabel = (score: number) => {
    if (score < 55) return 'SUROWY';
    if (score < 70) return 'SOLIDNY';
    if (score < 85) return 'MOCNY';
    return 'MISTRZOWSKI';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('rounded-full border-8 flex items-center justify-center font-bold', sizeClasses[size], getColor(score))}>
        {score}
      </div>
      <div className={cn('text-xs font-semibold tracking-wider', getColor(score))}>
        {getLabel(score)}
      </div>
    </div>
  );
}
