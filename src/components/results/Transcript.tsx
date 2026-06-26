import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptProps {
  text: string;
  fillers: string[];
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Transcript({ text, fillers }: TranscriptProps) {
  const [open, setOpen] = useState(false);

  const parts = useMemo(() => {
    if (!fillers.length) return [{ text, filler: false }];
    const pattern = new RegExp(`\\b(${fillers.map(escapeRegex).join("|")})\\b`, "gi");
    const tokens: { text: string; filler: boolean }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text))) {
      if (m.index > last) tokens.push({ text: text.slice(last, m.index), filler: false });
      tokens.push({ text: m[0], filler: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) tokens.push({ text: text.slice(last), filler: false });
    return tokens;
  }, [text, fillers]);

  return (
    <div className="card-premium overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
        aria-expanded={open}
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            Transkrypcja
          </div>
          <div className="font-display text-lg">Przeczytaj całą swoją mowę</div>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-5 pb-6 pt-1 border-t border-border">
          <p className="text-foreground/90 leading-relaxed text-base">
            {parts.map((p, i) =>
              p.filler ? (
                <span
                  key={i}
                  className="text-destructive font-semibold underline decoration-destructive/40 decoration-wavy underline-offset-4"
                >
                  {p.text}
                </span>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </p>
        </div>
      )}
    </div>
  );
}
