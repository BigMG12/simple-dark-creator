import { Card } from '@/components/ui/card';

interface MentorVerdictProps {
  quote: string;
  mentorName: string;
}

export function MentorVerdict({ quote, mentorName }: MentorVerdictProps) {
  return (
    <Card className="p-6 bg-red-50/50 border-red-600">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">💬 {mentorName.toUpperCase()} MÓWI:</h3>
      <blockquote className="text-sm leading-relaxed italic">
        "{quote}"
      </blockquote>
    </Card>
  );
}
