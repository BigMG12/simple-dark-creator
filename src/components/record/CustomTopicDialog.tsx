import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CustomTopicDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (topic: string) => void;
}

export function CustomTopicDialog({ open, onOpenChange, onSubmit }: CustomTopicDialogProps) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 200;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Twój temat</DialogTitle>
          <DialogDescription>O czym chcesz mówić? (3–200 znaków)</DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="np. Dlaczego poranne rutyny są ważne…"
          rows={4}
          maxLength={220}
          className="bg-background"
        />
        <div className="text-xs text-muted-foreground font-mono">{trimmed.length}/200</div>
        <DialogFooter>
          <Button variant="ghost-dark" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button
            variant="fire"
            disabled={!valid}
            onClick={() => {
              onSubmit(trimmed);
              setValue("");
            }}
          >
            Użyj tematu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
