import type { CategoryId } from "./categories";

export type ConversationType =
  | "sales"
  | "meeting"
  | "interviewee"
  | "interviewer"
  | "negotiation"
  | "coaching";

export interface ConversationTypeMeta {
  label: string;
  description: string;
  /** Category id — provides accent color + gradient via CATEGORY_BY_ID. */
  categoryId: CategoryId;
  /** Legacy accent alias — CSS var without `--`. */
  accent: string;
  icon: string;
  /** Two-letter monogram used for mentor persona badge. */
  monogram: string;
  /** Human-readable persona name shown as "verdict speaker". */
  mentorName: string;
  /** Kicker copy for the verdict section. */
  verdictKicker: string;
}

export const CONVERSATION_TYPE_META: Record<ConversationType, ConversationTypeMeta> = {
  sales: {
    label: "Rozmowa sprzedażowa",
    description: "Pitching, obsługa obiekcji, zamykanie.",
    categoryId: "sales",
    accent: "category-sales",
    icon: "target",
    monogram: "SP",
    mentorName: "Sprzedawca",
    verdictKicker: "Co by powiedział Sprzedawca",
  },
  meeting: {
    label: "Spotkanie",
    description: "Dyskusja grupowa, punkty akcji, wkład.",
    categoryId: "influence",
    accent: "category-influence",
    icon: "users",
    monogram: "OP",
    mentorName: "Operator",
    verdictKicker: "Co by powiedział Operator",
  },
  interviewee: {
    label: "Rozmowa kwalifikacyjna — jestem rozmówcą",
    description: "Rozmowa o pracę, gość podcastu, prasa.",
    categoryId: "authority",
    accent: "category-authority",
    icon: "user",
    monogram: "KA",
    mentorName: "Kandydat",
    verdictKicker: "Co by powiedział Kandydat",
  },
  interviewer: {
    label: "Rozmowa kwalifikacyjna — prowadzę rozmowę",
    description: "Rekrutacja, prowadzenie podcastu, dziennikarstwo.",
    categoryId: "authority",
    accent: "category-authority",
    icon: "message-circle",
    monogram: "PR",
    mentorName: "Prowadzący",
    verdictKicker: "Co by powiedział Prowadzący",
  },
  negotiation: {
    label: "Negocjacje",
    description: "Zakotwiczenie, ramowanie, taniec ustępstw.",
    categoryId: "influence",
    accent: "category-influence",
    icon: "scale",
    monogram: "NG",
    mentorName: "Negocjator",
    verdictKicker: "Co by powiedział Negocjator",
  },
  coaching: {
    label: "Sesja coachingowa",
    description: "Prowadzenie, zadawanie pytań, mentoring.",
    categoryId: "leadership",
    accent: "category-leadership",
    icon: "graduation-cap",
    monogram: "CO",
    mentorName: "Coach",
    verdictKicker: "Co by powiedział Coach",
  },
};
