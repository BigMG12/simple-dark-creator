import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useSparring } from '@/contexts/SparringContext';
import { MOCKED_HISTORY } from '@/data/sparring/history';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'win' | 'survive' | 'loss';

export default function SparringHistory() {
  const navigate = useNavigate();
  const { sessionHistory } = useSparring();
  const [filter, setFilter] = useState<FilterType>('all');

  const allSessions = sessionHistory.length > 0 ? sessionHistory : MOCKED_HISTORY;

  const filteredSessions = allSessions.filter((session) => {
    if (filter === 'all') return true;
    if (filter === 'win') return session.score >= 70;
    if (filter === 'survive') return session.score >= 50 && session.score < 70;
    if (filter === 'loss') return session.score < 50;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sparring')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">TWOJA HISTORIA</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Wszystkie
          </Button>
          <Button
            variant={filter === 'win' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('win')}
            className={cn(filter === 'win' && 'bg-green-600 hover:bg-green-700')}
          >
            Win (70+)
          </Button>
          <Button
            variant={filter === 'survive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('survive')}
            className={cn(filter === 'survive' && 'bg-yellow-600 hover:bg-yellow-700')}
          >
            Survive (50-69)
          </Button>
          <Button
            variant={filter === 'loss' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('loss')}
            className={cn(filter === 'loss' && 'bg-red-600 hover:bg-red-700')}
          >
            Loss (&lt;50)
          </Button>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {filter === 'all'
                ? 'Twoja historia jest pusta. Czas zacząć walczyć.'
                : 'Brak sesji w tej kategorii.'}
            </p>
            <Button onClick={() => navigate('/sparring/setup')}>NOWY SPARRING</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 hover:border-red-600 transition-colors cursor-pointer"
                onClick={() => navigate(`/sparring/result/${session.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {session.score >= 70 ? '✅' : session.score >= 50 ? '⚠️' : '❌'}
                      </span>
                      <span className="font-bold text-lg">{session.score}/100</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {formatDistanceToNow(session.timestamp, { addSuffix: true, locale: pl })}
                    </div>
                    <div className="text-sm font-medium mb-2">
                      {session.category} • {session.level} • Coach: {typeof session.mentor === "string" ? session.mentor : session.mentor?.name}
                    </div>
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      "{("verdict_preview" in session ? (session as any).verdict_preview : "") || ""}"
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Zobacz pełen wynik
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
