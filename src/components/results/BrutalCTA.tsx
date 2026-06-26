import { Button } from "@/components/ui/button"
import { RotateCcw, Sparkles, Home } from "lucide-react"

interface BrutalCTAProps {
  accentColor: string
  mentorName: string
  onRetry: () => void
  onDrill: () => void
  onHome: () => void
}

/**
 * Full-bleed "ZNÓW. TERAZ." CTA w stylu mentora.
 * Mocniejsze niż 3 równe przyciski — bo to sedno coachingu.
 */
export function BrutalCTA({ accentColor, mentorName, onRetry, onDrill, onHome }: BrutalCTAProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accentColor}33 0%, ${accentColor}11 60%, transparent 100%)`,
        }}
      />
      <div className="absolute inset-0 bg-background/60" />

      <div className="relative p-7 md:p-10">
        <div
          className="font-mono text-[10px] uppercase tracking-[0.4em] mb-2"
          style={{ color: accentColor }}
        >
          {mentorName} mówi
        </div>
        <h3 className="font-display text-4xl md:text-6xl leading-none mb-2 tracking-tight">
          ZNÓW.
        </h3>
        <h3
          className="font-display text-4xl md:text-6xl leading-none mb-6 tracking-tight"
          style={{ color: accentColor }}
        >
          TERAZ.
        </h3>
        <p className="text-foreground/85 mb-8 max-w-xl">
          Każda następna sesja to dowód, że robisz robotę. Nie pierdol — wciśnij i jedź.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1 font-semibold shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: accentColor, color: "white" }}
            onClick={onRetry}
          >
            <RotateCcw />
            Nagraj jeszcze raz
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-border/60 hover:bg-foreground/5"
            onClick={onDrill}
          >
            <Sparkles />
            Dzienne ćwiczenie
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="flex-1 text-muted-foreground hover:text-foreground"
            onClick={onHome}
          >
            <Home />
            Panel
          </Button>
        </div>
      </div>
    </section>
  )
}
