import { Card } from '@/components/ui/card';

interface AlternativeResponseProps {
  response: string;
  mentorName: string;
}

export function AlternativeResponse({ response, mentorName }: AlternativeResponseProps) {
  return (
    <Card className="p-6 bg-green-50/50 border-green-600">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">🥷 JA BYM ZAGRAŁ TAK:</h3>
      <div className="text-sm leading-relaxed whitespace-pre-line">
        {response}
      </div>
    </Card>
  );
}
