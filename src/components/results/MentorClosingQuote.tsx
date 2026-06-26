interface MentorClosingQuoteProps {
  quote: string;
  mentorName: string;
  accentColor: string;
}

export function MentorClosingQuote({ quote, mentorName, accentColor }: MentorClosingQuoteProps) {
  return (
    <div className="card-premium p-10 text-center relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: accentColor }}
      />
      <div
        className="font-serif text-2xl md:text-3xl italic leading-relaxed mb-4"
        style={{ color: accentColor }}
      >
        "{quote}"
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="h-px w-12 bg-border" />
        <span className="font-mono text-sm text-muted-foreground">— {mentorName}</span>
        <div className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}
