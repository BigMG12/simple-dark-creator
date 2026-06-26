import { Flame, Target, Zap, Crown, BookOpen, Brain, type LucideIcon } from "lucide-react";

export type CategoryId =
  | "motivation"
  | "sales"
  | "influence"
  | "leadership"
  | "storytelling"
  | "authority";

export interface Category {
  id: CategoryId;
  name: string;
  icon: LucideIcon;
  /** CSS var name (without `--`) for the accent color, in HSL components */
  accentVar: string;
  /** CSS var name for the matching gradient */
  gradientVar: string;
  /** One-line description of what this category emphasizes */
  lens: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "motivation",
    name: "Motywacja",
    icon: Flame,
    accentVar: "category-motivation",
    gradientVar: "gradient-category-motivation",
    lens: "Wariancja energii, emocjonalne crescendo, siła wezwania do działania.",
  },
  {
    id: "sales",
    name: "Sprzedaż",
    icon: Target,
    accentVar: "category-sales",
    gradientVar: "gradient-category-sales",
    lens: "Wyzwalacze pilności, obsługa obiekcji, ramowanie wartości, język zamykania.",
  },
  {
    id: "influence",
    name: "Wpływ",
    icon: Zap,
    accentVar: "category-influence",
    gradientVar: "gradient-category-influence",
    lens: "Przerwanie wzorców, ramowanie, dowód społeczny, markery pewności.",
  },
  {
    id: "leadership",
    name: "Przywództwo",
    icon: Crown,
    accentVar: "category-leadership",
    gradientVar: "gradient-category-leadership",
    lens: "Powaga, celowe pauzy, język wizjonerski.",
  },
  {
    id: "storytelling",
    name: "Opowiadanie",
    icon: BookOpen,
    accentVar: "category-storytelling",
    gradientVar: "gradient-category-storytelling",
    lens: "Łuk narracyjny, język zmysłowy, wrażliwość, użycie dialogu.",
  },
  {
    id: "authority",
    name: "Autorytet",
    icon: Brain,
    accentVar: "category-authority",
    gradientVar: "gradient-category-authority",
    lens: "Precyzja, intelektualna pewność, gęstość odniesień, ustrukturyzowana argumentacja.",
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>,
);

/** Get inline styles applying the category accent as `color` / `background` */
export function categoryStyle(id: CategoryId) {
  const c = CATEGORY_BY_ID[id];
  return {
    color: `hsl(var(--${c.accentVar}))`,
  } as const;
}
