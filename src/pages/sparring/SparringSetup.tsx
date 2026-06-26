import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { LevelSelector } from '@/components/sparring/LevelSelector';
import { MentorPicker } from '@/components/sparring/MentorPicker';
import { useSparring } from '@/contexts/SparringContext';
import { useScenarioRandom } from '@/hooks/sparring/useScenarioRandom';
import { SparringCategory } from '@/data/sparring/scenarios';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'price_objection', icon: '💰', title: 'Obiekcja cenowa' },
  { id: 'indecision', icon: '❓', title: 'Niezdecydowanie' },
  { id: 'competition', icon: '⚔️', title: 'Konkurencja' },
  { id: 'anger', icon: '🔥', title: 'Gniew klienta' },
  { id: 'no_urgency', icon: '⏰', title: 'Brak pilności' },
] as const;

export default function SparringSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentSession } = useSparring();
  const { getScenario } = useScenarioRandom();

  const preselectedCategory = location.state?.preselectedCategory as SparringCategory | undefined;

  const [selectedCategory, setSelectedCategory] = useState<SparringCategory | null>(
    preselectedCategory || null
  );
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(2);
  const [selectedMentor, setSelectedMentor] = useState<{ id: string; name: string }>({
    id: 'goggins',
    name: 'David Goggins',
  });

  const handleStart = () => {
    if (!selectedCategory) return;

    const scenario = getScenario(selectedCategory, selectedLevel);
    const sessionId = crypto.randomUUID();

    setCurrentSession({
      id: sessionId,
      scenario,
      mentor: selectedMentor,
      category: selectedCategory,
      level: selectedLevel,
      timestamp: new Date(),
    });

    navigate(`/sparring/ring/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sparring')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">SETUP RINGU</h1>
        </div>

        <div className="space-y-8">
          {/* Krok 1: Kategoria */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Krok 1: Kategoria
            </h2>
            <div className="grid gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                    selectedCategory === cat.id
                      ? 'border-red-600 bg-red-50/50'
                      : 'border-border hover:border-red-300'
                  )}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-medium">{cat.title}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Krok 2: Level */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Krok 2: Level trudności
            </h2>
            <LevelSelector value={selectedLevel} onChange={setSelectedLevel} />
          </Card>

          {/* Krok 3: Mentor */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Krok 3: Mentor (kto Cię oceni)
            </h2>
            <MentorPicker
              value={selectedMentor.id}
              onChange={(id, name) => setSelectedMentor({ id, name })}
            />
          </Card>

          {/* Submit */}
          <Button
            size="lg"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
            onClick={handleStart}
            disabled={!selectedCategory}
          >
            🥊 WCHODZĘ NA RING
          </Button>
        </div>
      </div>
    </div>
  );
}
