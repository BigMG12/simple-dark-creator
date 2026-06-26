interface MentorMonogramBackdropProps {
  monogram: string
  accentColor: string
}

/**
 * Wielki ambient monogram mentora w tle hero (np. "TG", "DG").
 * Bardzo niska opacity — efekt "to wystąpienie tej konkretnej osoby".
 */
export function MentorMonogramBackdrop({ monogram, accentColor }: MentorMonogramBackdropProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden"
    >
      <span
        className="font-display leading-none tracking-tighter"
        style={{
          fontSize: "clamp(18rem, 38vw, 36rem)",
          color: accentColor,
          opacity: 0.05,
          mixBlendMode: "screen",
        }}
      >
        {monogram}
      </span>
    </div>
  )
}
