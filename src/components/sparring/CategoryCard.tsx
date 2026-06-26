import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  icon: string;
  title: string;
  stats: {
    lastScore: number;
    average: number;
    count: number;
    best: number;
  };
  onClick: () => void;
  selected?: boolean;
}

export function CategoryCard({ icon, title, stats, onClick, selected }: CategoryCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 cursor-pointer transition-all hover:border-red-600 hover:shadow-lg',
        selected && 'border-red-600 bg-red-50/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-2">{title}</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <div className="font-mono">Ostatni: {stats.lastScore}</div>
              <div className="font-mono">Średnia: {stats.average}</div>
            </div>
            <div>
              <div className="font-mono">Sesji: {stats.count}</div>
              <div className="font-mono">Najlepszy: {stats.best}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
