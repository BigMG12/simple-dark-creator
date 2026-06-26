import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Sparkles, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { useWeeklyReviews } from "@/hooks/queries";
import { cn } from "@/lib/utils";

export default function Reviews() {
  const { data: reviews = [], isLoading } = useWeeklyReviews();
  const [expanded, setExpanded] = useState<string | null>(reviews[0]?.id ?? null);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-8">
        <header className="space-y-3">
          <Link
            to="/progress"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Powrót do postępów
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Recenzje trenera</span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl tracking-tight">Cotygodniowe <span className="text-gradient-primary">recenzje</span></h1>
          <p className="text-muted-foreground text-sm">Każdej niedzieli twój trener analizuje tydzień.</p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-display text-xl mb-2">Brak recenzji</p>
            <p className="text-sm text-muted-foreground">Twoje cotygodniowe recenzje pojawią się tutaj.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline rail */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {reviews.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <div key={r.id} className="relative pl-10">
                    <span
                      className={cn(
                        "absolute left-1.5 top-4 h-3 w-3 rounded-full border-2 transition-all",
                        isOpen ? "bg-accent border-accent shadow-elegant" : "bg-background border-border",
                      )}
                    />
                    <div className="card-premium overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="font-display text-lg">
                            Tydzień{" "}
                            {new Date(r.week_of).toLocaleDateString("pl-PL", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            {r.sessions_count} sesji · śr. {Math.round(r.avg_score)} · {Math.round(r.total_minutes)}m mówienia
                          </p>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                          <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                            <p>{r.summary}</p>
                          </div>
                          <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              Wygenerowane przez AI
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard?.writeText(r.summary);
                                toast.success("Recenzja skopiowana do schowka");
                              }}
                            >
                              <Share2 className="h-4 w-4" /> Udostępnij
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
        )}
      </div>
    </AppShell>
  );
}
