import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onQuit?: () => void;
  showProgress?: boolean;
  progressCurrent?: number;
  progressTotal?: number;
}

export default function ExerciseLayout({
  children,
  title,
  subtitle,
  onBack,
  onQuit,
  showProgress,
  progressCurrent = 0,
  progressTotal,
}: ExerciseLayoutProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));
  const handleQuit = onQuit ?? (() => navigate("/practice"));

  const pct =
    showProgress && progressTotal
      ? Math.min(100, Math.max(0, (progressCurrent / progressTotal) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Cofnij</span>
          </button>

          {title && (
            <div className="min-w-0 flex-1 text-center">
              <div className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
                {title}
              </div>
              {subtitle && (
                <div className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleQuit}
            aria-label="Zakończ"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
              !title && "ml-auto",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showProgress && progressTotal ? (
          <div className="h-1 w-full bg-surface">
            <div
              className="h-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
