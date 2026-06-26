import { cn } from "@/lib/utils";

interface SplitComparisonProps {
  userText: string;
  mentorText: string;
  mentorName: string;
  accentColor: string;
}

export function SplitComparison({ userText, mentorText, mentorName, accentColor }: SplitComparisonProps) {
  return (
    <div className="card-premium p-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-5">
        Jak by to powiedział {mentorName}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Ty powiedziałeś:
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-foreground/70 italic leading-relaxed">
              "{userText}"
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div
            className="font-mono text-xs uppercase tracking-wider font-semibold"
            style={{ color: accentColor }}
          >
            {mentorName} powiedziałby:
          </div>
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: accentColor,
              background: `${accentColor}08`
            }}
          >
            <p
              className="text-sm font-medium leading-relaxed"
              style={{ color: accentColor }}
            >
              "{mentorText}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
