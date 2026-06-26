import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GoalAchievedCelebrationProps {
  goalTitle: string | null;
  open: boolean;
  onClose: () => void;
}

export function GoalAchievedCelebration({ goalTitle, open, onClose }: GoalAchievedCelebrationProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (!open || !goalTitle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || fired.current) return;
    fired.current = true;
    const colors = ["#FACC15", "#EAB308", "#F59E0B", "#FCD34D"];
    const end = Date.now() + 1500;
    const tick = () => {
      confetti({ particleCount: 5, angle: 60, spread: 75, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 75, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
    return () => { fired.current = false; };
  }, [open, goalTitle]);

  if (!goalTitle) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-border max-w-md text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">Goal Achieved</div>
        <div className="relative mx-auto my-4 h-28 w-28">
          <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-30 blur-2xl" />
          <div className="relative h-28 w-28 rounded-full bg-gradient-gold flex items-center justify-center shadow-elegant">
            <Trophy className="h-14 w-14 text-accent-foreground" strokeWidth={2.5} />
          </div>
        </div>
        <DialogTitle className="font-display text-2xl text-gradient-gold">{goalTitle}</DialogTitle>
        <DialogDescription className="text-base text-foreground/80 mt-2">
          Logged in your journey. Now set the next one.
        </DialogDescription>
        <Button variant="fire" size="lg" onClick={onClose} className="mt-6 w-full">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
