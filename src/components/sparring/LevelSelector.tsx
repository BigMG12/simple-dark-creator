import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface LevelSelectorProps {
  value: 1 | 2 | 3;
  onChange: (level: 1 | 2 | 3) => void;
}

const LEVELS = [
  { value: 1, label: 'Easy', description: 'klient luźny, kupuje na lifestyle' },
  { value: 2, label: 'Medium', description: 'standardowy retail klient' },
  { value: 3, label: 'Hard', description: 'sceptyczny senior, premium price' },
] as const;

export function LevelSelector({ value, onChange }: LevelSelectorProps) {
  return (
    <RadioGroup value={value.toString()} onValueChange={(v) => onChange(parseInt(v) as 1 | 2 | 3)}>
      <div className="space-y-3">
        {LEVELS.map((level) => (
          <div key={level.value} className="flex items-start space-x-3">
            <RadioGroupItem value={level.value.toString()} id={`level-${level.value}`} />
            <Label htmlFor={`level-${level.value}`} className="cursor-pointer flex-1">
              <div className="font-semibold">{level.label}</div>
              <div className="text-xs text-muted-foreground">{level.description}</div>
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}
