import type { Drill } from "@/data/drills";

interface Props {
  drill: Drill;
  compact?: boolean;
}

export default function DrillTextDisplay({ drill, compact }: Props) {
  const baseText = compact
    ? "font-display text-xl leading-snug sm:text-2xl"
    : "font-display text-2xl leading-snug sm:text-4xl";

  if (drill.contentKind === "words") {
    return (
      <div className="space-y-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Użyj każdego słowa
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {drill.wordList?.map((w) => (
            <span
              key={w}
              className="rounded-full bg-gradient-primary px-3 py-1.5 font-display text-sm text-primary-foreground shadow-elegant sm:px-4 sm:py-2 sm:text-base"
            >
              {w}
            </span>
          ))}
        </div>
        <p className="text-sm italic text-muted-foreground sm:text-base">{drill.content}</p>
      </div>
    );
  }

  if (drill.contentKind === "phrase") {
    return (
      <p className={`text-center text-gradient-primary ${baseText}`}>{drill.content}</p>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {drill.contentKind === "passage" ? "Przeczytaj na głos" : "Twój temat"}
      </div>
      <p className={baseText}>{drill.content}</p>
    </div>
  );
}
