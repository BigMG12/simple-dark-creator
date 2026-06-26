import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play, ArrowRight } from "lucide-react";

interface VSLModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional MP4 source. When empty a "wkrótce" placeholder is shown. */
  src?: string;
  poster?: string;
}

const VSLModal = ({ open, onOpenChange, src, poster }: VSLModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 border-onboarding-line bg-onboarding-bg overflow-hidden">
        <div className="relative aspect-video bg-black">
          {src ? (
            <video
              src={src}
              poster={poster}
              controls
              autoPlay
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="h-16 w-16 rounded-full border border-ember/40 flex items-center justify-center bg-ember/10">
                <Play className="h-6 w-6 text-ember" fill="currentColor" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-warm">
                VSL · wkrótce
              </p>
              <p className="font-serif text-2xl md:text-3xl text-foreground max-w-md leading-tight">
                Tutaj wyląduje wprowadzenie do Big Speaking.
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Wgraj plik .mp4 i podaj go w propsie <code className="text-ember">src</code>.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-5 bg-onboarding-bg border-t border-onboarding-line">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em]">
            Big Speaking · Intro
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Zamknij
            </button>
            <button
              onClick={() => {
                onOpenChange(false);
                navigate("/welcome");
              }}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember text-onboarding-bg text-sm font-medium hover:bg-ember-hot transition-colors"
            >
              Mam plan, zacznijmy
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VSLModal;
