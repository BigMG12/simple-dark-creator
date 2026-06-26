export type ConversationType =
  | "sales"
  | "meeting"
  | "interviewee"
  | "interviewer"
  | "negotiation"
  | "coaching";

export const CONVERSATION_TYPE_META: Record<
  ConversationType,
  { label: string; description: string; accent: string; icon: string }
> = {
  sales: {
    label: "Rozmowa sprzedażowa",
    description: "Pitching, obsługa obiekcji, zamykanie.",
    accent: "category-sales",
    icon: "target",
  },
  meeting: {
    label: "Spotkanie",
    description: "Dyskusja grupowa, punkty akcji, wkład.",
    accent: "category-influence",
    icon: "users",
  },
  interviewee: {
    label: "Rozmowa kwalifikacyjna — jestem rozmówcą",
    description: "Rozmowa o pracę, gość podcastu, prasa.",
    accent: "category-authority",
    icon: "user",
  },
  interviewer: {
    label: "Rozmowa kwalifikacyjna — prowadzę rozmowę",
    description: "Rekrutacja, prowadzenie podcastu, dziennikarstwo.",
    accent: "category-authority",
    icon: "message-circle",
  },
  negotiation: {
    label: "Negocjacje",
    description: "Zakotwiczenie, ramowanie, taniec ustępstw.",
    accent: "category-influence",
    icon: "scale",
  },
  coaching: {
    label: "Sesja coachingowa",
    description: "Prowadzenie, zadawanie pytań, mentoring.",
    accent: "category-leadership",
    icon: "graduation-cap",
  },
};
