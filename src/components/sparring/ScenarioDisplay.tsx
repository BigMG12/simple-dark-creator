import { Card } from '@/components/ui/card';
import { SparringScenario } from '@/data/sparring/scenarios';

interface ScenarioDisplayProps {
  scenario: SparringScenario;
  mentorName: string;
}

export function ScenarioDisplay({ scenario, mentorName }: ScenarioDisplayProps) {
  if (!scenario) return null;

  return (
    <div className="space-y-6">

      <Card className="p-6 bg-surface">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">📋 SYTUACJA:</h3>
        <p className="text-sm leading-relaxed">{scenario.context}</p>
      </Card>

      <Card className="p-6 border-red-600 bg-red-50/50">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">💬 KLIENT WŁAŚNIE POWIEDZIAŁ:</h3>
        <p className="text-sm leading-relaxed font-medium">{scenario.opening_line}</p>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">🎯 TWOJE ZADANIE:</h3>
        <ul className="space-y-1 text-sm">
          <li>• Zareaguj profesjonalnie</li>
          <li>• Nie obniżaj ceny</li>
          <li>• Uzasadnij wartość</li>
          <li>• Maks 30 sekund</li>
        </ul>
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Mentor obserwujący: <span className="font-semibold">{mentorName}</span>
        </div>
      </Card>
    </div>
  );
}
