interface SectionHeaderProps {
  number: number
  kicker: string
  title: string
  accentColor?: string
  sticky?: never
}

/**
 * Spójny nagłówek dla każdej sekcji wyników.
 * Używaj jako pierwszy element w <section id="section-N">.
 */
export function SectionHeader({ number, kicker, title, accentColor }: SectionHeaderProps) {
  const num = String(number).padStart(2, "0")
  return (
    <div className="mb-5">
      <div
        className="font-mono text-[10px] uppercase tracking-[0.3em] mb-1.5 flex items-center gap-2"
        style={{ color: accentColor ?? "hsl(var(--muted-foreground))" }}
      >
        <span>Sekcja {num}</span>
        <span className="opacity-50">·</span>
        <span className="opacity-80">{kicker}</span>
      </div>
      <h2 className="font-display text-2xl md:text-3xl tracking-tight">{title}</h2>
    </div>
  )
}
