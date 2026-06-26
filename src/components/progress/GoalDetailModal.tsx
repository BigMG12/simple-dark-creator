import { Link } from "react-router-dom";
import { Calendar, Edit2, PauseCircle, Trash2, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  progressPercent: number;
};

interface GoalDetailModalProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
}

function daysRemaining(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  return `${diff}d left`;
}

export function GoalDetailModal({ goal, open, onClose }: GoalDetailModalProps) {
  if (!goal) return null;
  const nearComplete = goal.progressPercent >= 75;

  // Simplified without mock details
  const detail: {
    recentSessions?: { id: string; topic: string; date: string; contribution: string }[]
    recommendedDrills?: { id: string; title?: string; name?: string; reason?: string; xp?: number }[]
  } | null = null;
  const history: any[] = [];
  const max = Math.max(goal.targetValue, ...history.map((h) => h.value));
  const min = Math.min(0, ...history.map((h) => h.value));
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const points = history
    .map((p, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * w;
      const y = h - ((p.value - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const targetY = h - ((goal.targetValue - min) / range) * h;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{goal.title}</DialogTitle>
          <DialogDescription className="font-mono text-xs flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {new Date(goal.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric" })} ·{" "}
            <span className={cn(nearComplete && "text-accent")}>{daysRemaining(goal.deadline)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl">{goal.currentValue}</span>
            <span className="font-mono text-sm text-muted-foreground">/ {goal.targetValue}</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${goal.progressPercent}%`,
                background: nearComplete ? "var(--gradient-gold)" : "var(--gradient-primary)",
                boxShadow: nearComplete ? "0 0 12px hsl(var(--accent) / 0.5)" : undefined,
              }}
            />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            {goal.progressPercent}% complete
          </p>
        </div>

        {/* Mini chart */}
        {history.length > 1 && (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Progress over time
            </p>
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
              <line
                x1={0}
                x2={w}
                y1={targetY}
                y2={targetY}
                stroke="hsl(var(--accent))"
                strokeDasharray="4 3"
                strokeOpacity={0.5}
              />
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {history.map((p, i) => {
                const x = (i / Math.max(history.length - 1, 1)) * w;
                const y = h - ((p.value - min) / range) * h;
                return <circle key={i} cx={x} cy={y} r={2.5} fill="hsl(var(--primary))" />;
              })}
            </svg>
          </div>
        )}

        {/* Recent sessions */}
        {detail?.recentSessions && detail.recentSessions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase font-mono text-muted-foreground tracking-wider">Recent contributions</p>
            <div className="space-y-1.5">
              {detail.recentSessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/results/${s.id}`}
                  className="flex items-center justify-between p-2.5 rounded-md bg-background border border-border hover:border-foreground/30 transition-colors text-xs"
                  onClick={onClose}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.topic}</p>
                    <p className="text-muted-foreground font-mono text-[10px] mt-0.5">
                      {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="font-mono text-accent shrink-0">{s.contribution}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Drills */}
        {detail?.recommendedDrills && detail.recommendedDrills.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase font-mono text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent" /> Drills that help
            </p>
            <div className="space-y-1.5">
              {detail.recommendedDrills.map((d) => (
                <Link
                  key={d.id}
                  to={`/drills/${d.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-md bg-background border border-border hover:border-accent transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
                  </div>
                  <span className="font-mono text-[10px] text-accent">+{d.xp} XP</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => toast("Edit coming soon")}>
            <Edit2 className="h-4 w-4" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast("Goal paused")}>
            <PauseCircle className="h-4 w-4" /> Pause
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.success("Goal deleted");
              onClose();
            }}
            className="text-destructive hover:text-destructive ml-auto"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
