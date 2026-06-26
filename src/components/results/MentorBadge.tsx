import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface MentorBadgeProps {
  name: string;
  monogram: string;
}

export function MentorBadge({ name, monogram }: MentorBadgeProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-border bg-surface hover:border-accent transition-colors"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Compared to
        </span>
        <span className="h-7 w-7 rounded-full bg-gradient-gold flex items-center justify-center font-mono text-xs font-bold text-accent-foreground">
          {monogram}
        </span>
        <span className="font-display text-sm">{name}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Change Mentor</DialogTitle>
            <DialogDescription>
              Pick a different speaker to compare against. Your stats will recalibrate to their style.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
            🚧 Mentor library lands in the next step.
          </div>
          <DialogFooter>
            <Button variant="ghost-dark" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
