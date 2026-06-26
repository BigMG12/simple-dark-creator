import { cn } from "@/lib/utils";
import { CATEGORY_BY_ID } from "@/data/categories";
import type { CategoryId } from "@/data/categories";

interface MentorAvatarProps {
  monogram: string;
  name: string;
  category: CategoryId;
  size?: "sm" | "md" | "lg";
}

export function MentorAvatar({ monogram, name, category, size = "md" }: MentorAvatarProps) {
  const cat = CATEGORY_BY_ID[category];
  const gradient = `var(--${cat.gradientVar})`;

  const sizeClasses = {
    sm: "h-12 w-12 text-lg",
    md: "h-16 w-16 text-2xl",
    lg: "h-24 w-24 text-4xl"
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-mono font-bold text-primary-foreground shadow-elegant relative",
          sizeClasses[size]
        )}
        style={{
          background: gradient,
          boxShadow: `0 0 30px ${gradient.replace('var(--', 'hsl(var(--').replace(')', ') / 0.4)')}`
        }}
      >
        {monogram}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: gradient,
            opacity: 0.3,
            filter: 'blur(8px)'
          }}
        />
      </div>
      <span className="font-mono text-xs text-muted-foreground">{name}</span>
    </div>
  );
}
