import { Quote } from "lucide-react";

interface CoachQuoteCardProps {
  text: string;
  mentorName: string;
}

export function CoachQuoteCard({ text, mentorName }: CoachQuoteCardProps) {
  return (
    <div className="card-premium relative p-6 md:p-8 overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-10 -left-6 text-primary/20"
      >
        <Quote className="h-32 w-32" strokeWidth={1.2} />
      </div>
      <div className="relative">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
          Coach Verdict
        </div>
        <p className="font-display text-xl md:text-2xl leading-relaxed tracking-tight text-foreground/95 italic">
          {text}
        </p>
        <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
          — {mentorName}
        </div>
      </div>
    </div>
  );
}
