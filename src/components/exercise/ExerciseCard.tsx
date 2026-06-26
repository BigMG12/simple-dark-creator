import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  badge?: string;
  featured?: boolean;
}

export default function ExerciseCard({
  icon: Icon,
  iconColor = "text-primary",
  title,
  description,
  ctaLabel,
  href,
  badge,
  featured,
}: ExerciseCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant sm:p-7",
        featured &&
          "border-primary/30 bg-gradient-to-br from-card to-surface shadow-elegant",
      )}
    >
      {featured && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        />
      )}

      {badge && (
        <span className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
          {badge}
        </span>
      )}

      <div className="relative">
        <div
          className={cn(
            "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface ring-1 ring-border transition-colors group-hover:ring-primary/30",
            featured && "h-14 w-14",
          )}
        >
          <Icon className={cn("h-6 w-6", iconColor, featured && "h-7 w-7")} />
        </div>

        <h3
          className={cn(
            "font-display text-xl font-semibold tracking-tight text-foreground",
            featured && "text-2xl sm:text-3xl",
          )}
        >
          {title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>

        <div
          className={cn(
            "mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary",
            featured && "text-base",
          )}
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
