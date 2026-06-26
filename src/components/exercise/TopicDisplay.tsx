interface Props {
  topic: string;
  eyebrow?: string;
  compact?: boolean;
}

export default function TopicDisplay({ topic, eyebrow = "Twój temat", compact }: Props) {
  return (
    <div className="space-y-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {eyebrow}
      </div>
      <p
        className={
          compact
            ? "font-display text-xl leading-snug sm:text-2xl"
            : "font-display text-2xl leading-snug sm:text-4xl"
        }
      >
        {topic}
      </p>
    </div>
  );
}
