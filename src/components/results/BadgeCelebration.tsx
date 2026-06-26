import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Flame, Star, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BadgeUnlock } from "@/data/mockResults";

const ICONS = { flame: Flame, trophy: Trophy, zap: Zap, star: Star };

interface BadgeCelebrationProps {
  badge: BadgeUnlock | null;
  open: boolean;
  onClose: () => void;
}

export function BadgeCelebration({ badge, open, onClose }: BadgeCelebrationProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!open || !badge) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || firedRef.current) return;
    firedRef.current = true;

    const colors = ["#F97316", "#FB923C", "#FACC15", "#EAB308"];
    const end = Date.now() + 1200;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    return () => {
      firedRef.current = false;
    };
  }, [open, badge]);

  if (!badge) return null;
  const Icon = ICONS[badge.icon];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-border max-w-md text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">
          Badge Unlocked
        </div>
        <div className="relative mx-auto my-4 h-28 w-28">
          <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-30 blur-2xl" />
          <div className="relative h-28 w-28 rounded-full bg-gradient-gold flex items-center justify-center shadow-elegant">
            <Icon className="h-14 w-14 text-accent-foreground" strokeWidth={2.5} />
          </div>
        </div>
        <DialogTitle className="font-display text-3xl text-gradient-gold">{badge.name}</DialogTitle>
        <DialogDescription className="text-base text-foreground/80 mt-2">
          {badge.description}
        </DialogDescription>
        <Button variant="fire" size="lg" onClick={onClose} className="mt-6 w-full">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
