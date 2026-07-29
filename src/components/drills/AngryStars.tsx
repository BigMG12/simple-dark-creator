import { cn } from "@/lib/utils";

/**
 * AngryStars — playful, Angry Birds-style star row.
 * - `earned` filled gold stars with glow.
 * - `max - earned` empty stars with dark outline.
 * - Slight tilt on outer stars for character.
 */
export function AngryStars({
  earned,
  max = 3,
  size = "md",
  className,
}: {
  earned: number;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = { xs: 12, sm: 16, md: 22, lg: 30 }[size];
  const gap = { xs: 1, sm: 2, md: 3, lg: 4 }[size];

  return (
    <div
      className={cn("inline-flex items-end", className)}
      style={{ gap }}
      aria-label={`${earned} z ${max} gwiazdek`}
    >
      {Array.from({ length: max }).map((_, i) => {
        const on = i < earned;
        // Middle star sits highest; outer stars tilt outward
        const tilt = i === 0 ? -10 : i === max - 1 ? 10 : 0;
        const lift = i === Math.floor(max / 2) ? -2 : 0;
        return (
          <span
            key={i}
            style={{
              transform: `translateY(${lift}px) rotate(${tilt}deg)`,
              display: "inline-block",
            }}
          >
            <StarShape on={on} dim={dim} />
          </span>
        );
      })}
    </div>
  );
}

function StarShape({ on, dim }: { on: boolean; dim: number }) {
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      style={{
        filter: on
          ? "drop-shadow(0 2px 4px rgba(255,170,0,0.55)) drop-shadow(0 0 6px rgba(255,215,0,0.35))"
          : "none",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`star-fill-${on ? "on" : "off"}`} x1="0" y1="0" x2="0" y2="1">
          {on ? (
            <>
              <stop offset="0%" stopColor="#FFE071" />
              <stop offset="55%" stopColor="#FFB300" />
              <stop offset="100%" stopColor="#E28100" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="hsl(var(--surface))" />
              <stop offset="100%" stopColor="hsl(var(--background))" />
            </>
          )}
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 6.2 6.6.7-4.9 4.7 1.4 6.7L12 17.6 5.9 20.8l1.4-6.7L2.5 9.4l6.6-.7L12 2.5z"
        fill={`url(#star-fill-${on ? "on" : "off"})`}
        stroke={on ? "#7A3E00" : "hsl(var(--border))"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {on && (
        <path
          d="M9.5 6.5 L11 4.5"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}
