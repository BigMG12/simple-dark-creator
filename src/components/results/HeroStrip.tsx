import { useEffect, useState } from "react"
import { ScoreRing } from "./ScoreRing"
import { MentorAvatar } from "./MentorAvatar"

interface HeroStripProps {
  score: number
  verdictLabel?: string | null
  verdictQuote?: string | null
  mentorMonogram: string
  mentorName: string
  mentorCategory: string
  accentColor: string
}

const NAV = [
  { id: "section-1", label: "1·Werdykt" },
  { id: "section-2", label: "2·Diagnoza" },
  { id: "section-3", label: "3·Liczby" },
  { id: "section-4", label: "4·Trend" },
  { id: "section-5", label: "5·Następny krok" },
  { id: "section-6", label: "6·Nauka" },
] as const

function smoothScrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 96
  window.scrollTo({ top, behavior: "smooth" })
}

export function HeroStrip({
  score,
  verdictLabel,
  verdictQuote,
  mentorMonogram,
  mentorName,
  mentorCategory,
  accentColor,
}: HeroStripProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    let raf: number
    const start = performance.now()
    const duration = 1200
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedScore(Math.round(score * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const showQuote = verdictQuote && verdictQuote.trim().length > 20

  return (
    <div
      className="sticky top-0 z-50 border-b border-border/60 bg-background shadow-lg"
      style={{ boxShadow: `0 4px 24px -8px ${accentColor}22` }}
    >
      {/* własna warstwa accent — żeby tło było SOLIDNE i nic nie prześwitywało */}
      <div className="absolute inset-0 -z-10 bg-background" />
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{ background: `linear-gradient(90deg, ${accentColor}10, transparent 40%)` }}
      />

      <div className="max-w-6xl mx-auto px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <ScoreRing score={animatedScore} size={52} stroke={5} hideLabels />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-display text-lg leading-none">{score}/100</span>
              {verdictLabel && (
                <span
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: `${accentColor}22`, color: accentColor }}
                >
                  {verdictLabel}
                </span>
              )}
            </div>
            {showQuote && (
              <p className="text-xs md:text-sm text-foreground/75 truncate italic">
                "{verdictQuote}"
              </p>
            )}
          </div>

          <div className="hidden md:flex flex-shrink-0 items-center gap-2 pl-3 border-l border-border/40">
            <MentorAvatar
              monogram={mentorMonogram}
              name={mentorName}
              category={mentorCategory as any}
              size="sm"
            />
          </div>
        </div>

        {/* Spis treści — chipy do scrolla */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2 -mx-1 px-1 scrollbar-none">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => smoothScrollTo(n.id)}
              className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
