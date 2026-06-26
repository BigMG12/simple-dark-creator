import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MicOff } from "lucide-react";

interface MicPermissionDialogProps {
  open: boolean;
  kind: "denied" | "notfound" | "unknown";
  onRetry: () => void;
  onBack: () => void;
}

const TITLE: Record<MicPermissionDialogProps["kind"], string> = {
  denied: "Mikrofon zablokowany",
  notfound: "Nie znaleziono mikrofonu",
  unknown: "Błąd mikrofonu",
};

const BODY: Record<MicPermissionDialogProps["kind"], string> = {
  denied: "Potrzebujemy dostępu do mikrofonu, aby nagrywać. Kliknij ikonę kłódki na pasku przeglądarki, zezwól na mikrofon, a następnie spróbuj ponownie.",
  notfound: "Nie wykryto mikrofonu. Podłącz go lub sprawdź ustawienia audio.",
  unknown: "Coś poszło nie tak podczas dostępu do mikrofonu. Spróbuj ponownie.",
};

export function MicPermissionDialog({ open, kind, onRetry, onBack }: MicPermissionDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="bg-surface border-border" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <MicOff className="h-7 w-7 text-destructive" />
          </div>
          <DialogTitle className="font-display text-2xl text-center">{TITLE[kind]}</DialogTitle>
          <DialogDescription className="text-center">{BODY[kind]}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="ghost-dark" onClick={onBack}>Wstecz</Button>
          <Button variant="fire" onClick={onRetry}>Spróbuj ponownie</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
