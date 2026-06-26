import { Flame } from "lucide-react";

interface TipCardProps {
  index: number;
  tip: string;
}

export function TipCard({ index, tip }: TipCardProps) {
  return (
    <div
      className="card-premium p-5 flex gap-4 items-start transition-transform duration-300 hover:-translate-y-1 animate-fade-in"
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
    >
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" aria-hidden />
        <div className="relative h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
          <Flame className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
          Tip 0{index + 1}
        </div>
        <p className="text-foreground/90 leading-relaxed text-[15px]">{tip}</p>
      </div>
    </div>
  );
}
