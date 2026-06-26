import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryCard } from '@/components/sparring/CategoryCard';
import { MOCKED_STATS } from '@/data/sparring/stats';
import { MOCKED_HISTORY } from '@/data/sparring/history';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'price_objection', icon: '💰', title: 'Obiekcja cenowa' },
  { id: 'indecision', icon: '❓', title: 'Niezdecydowanie' },
  { id: 'competition', icon: '⚔️', title: 'Konkurencja' },
  { id: 'anger', icon: '🔥', title: 'Gniew klienta' },
  { id: 'no_urgency', icon: '⏰', title: 'Brak pilności' },
] as const;

export default function SparringHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🥊</div>
          <h1 className="text-3xl font-bold mb-2">SPARRING</h1>
          <p className="text-muted-foreground">Tu nie ćwiczysz. Tu walczysz.</p>
        </div>

        {/* Categories Grid */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Kategorie
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CATEGORIES.map((cat) => {
              const stats = MOCKED_STATS.find(s => s.category === cat.id);
              return (
                <CategoryCard
                  key={cat.id}
                  icon={cat.icon}
                  title={cat.title}
                  stats={{
                    lastScore: stats?.last_score || 0,
                    average: stats?.average_score || 0,
                    count: stats?.total_sessions || 0,
                    best: stats?.best_score || 0,
                  }}
                  onClick={() => navigate('/sparring/setup', { state: { preselectedCategory: cat.id } })}
                />
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center mb-12">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8"
            onClick={() => navigate('/sparring/setup')}
          >
            NOWY SPARRING
          </Button>
        </div>

        {/* History Preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Historia (ostatnie 3)
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sparring/history')}
            >
              Zobacz wszystkie
            </Button>
          </div>
          <Card className="p-4">
            <div className="space-y-3">
              {MOCKED_HISTORY.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-sm border-b last:border-0 pb-3 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      {formatDistanceToNow(session.timestamp, { addSuffix: true, locale: pl })}
                    </div>
                    <div className="font-medium">
                      {session.category}, {session.level}, {session.score}/100
                    </div>
                  </div>
                  <div className="text-2xl">
                    {session.score >= 70 ? '✅' : session.score >= 50 ? '⚠️' : '❌'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
