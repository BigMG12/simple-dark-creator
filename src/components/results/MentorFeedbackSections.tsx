import { ThumbsUp, ThumbsDown } from "lucide-react";

interface MentorFeedbackSectionsProps {
  mentorName: string;
  loved: string[];
  hated: string[];
  accentColor: string;
}

export function MentorFeedbackSections({ mentorName, loved, hated, accentColor }: MentorFeedbackSectionsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card-premium p-6 border-l-4 border-l-success">
        <div className="flex items-center gap-2 mb-4">
          <ThumbsUp className="h-5 w-5 text-success" />
          <h3 className="font-display text-lg">Co {mentorName} docenił</h3>
        </div>
        <ul className="space-y-2">
          {loved.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="text-success mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-premium p-6 border-l-4 border-l-destructive">
        <div className="flex items-center gap-2 mb-4">
          <ThumbsDown className="h-5 w-5 text-destructive" />
          <h3 className="font-display text-lg">Czego {mentorName} nigdy by nie zrobił</h3>
        </div>
        <ul className="space-y-2">
          {hated.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="text-destructive mt-0.5">✗</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
