import { Dices, PenLine, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecordingMode } from "@/hooks/use-recording-session";

interface TopicPickerProps {
  onPick: (mode: RecordingMode) => void;
}

const CARDS: { mode: RecordingMode; title: string; desc: string; Icon: typeof Dices }[] = [
  { mode: "random", title: "Losowy temat", desc: "Otrzymaj niespodziewany temat", Icon: Dices },
  { mode: "custom", title: "Twój własny temat", desc: "Wpisz cokolwiek", Icon: PenLine },
  { mode: "challenge", title: "Wyzwanie mówcy", desc: "Dopasuj styl swojego mentora", Icon: Flame },
];

export function TopicPicker({ onPick }: TopicPickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {CARDS.map(({ mode, title, desc, Icon }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onPick(mode)}
          className={cn(
            "card-premium p-7 text-left group min-h-[180px] flex flex-col justify-between",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="mt-6">
            <div className="font-display text-xl mb-1">{title}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
