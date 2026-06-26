export const RANDOM_TOPICS: string[] = [
  "Przekonaj mnie, że porażka to dar.",
  "Zaprezentuj swój wymarzony startup w 60 sekund.",
  "Opisz najważniejszą lekcję, którą musi usłyszeć twoje młodsze ja.",
  "Dlaczego dyscyplina pokonuje motywację?",
  "Sprzedaj mi szklankę wody, jakby była ostatnią na Ziemi.",
  "Jaka jest jedna rzecz, co do której większość ludzi się myli?",
  "Opowiedz historię o momencie, który wszystko zmienił.",
  "Obroń niepopularną opinię, którą wyznajeszz.",
  "Wyjaśnij złożoną ideę, jakbym miał dziesięć lat.",
  "Co byś zrobił, gdybyś wiedział, że nie możesz przegrać?",
];

export const SPEAKER_CHALLENGES: { speaker: string; prompt: string }[] = [
  { speaker: "Steve Jobs", prompt: "Zaprezentuj produkt, który zmienia sposób, w jaki ludzie się łączą." },
  { speaker: "Barack Obama", prompt: "Przemów do narodu w momencie zwątpienia." },
  { speaker: "Simon Sinek", prompt: "Wyjaśnij, dlaczego twoje 'dlaczego' jest ważniejsze niż twoje 'co'." },
  { speaker: "Les Brown", prompt: "Przekonaj kogoś, że jego marzenie wciąż żyje." },
  { speaker: "David Goggins", prompt: "Popchnij kogoś poza punkt, który uważał za swój limit." },
];

export const DURATIONS = [30, 60, 90, 180] as const;
export type Duration = (typeof DURATIONS)[number];

export function pickRandomTopic(): string {
  return RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
}

export function pickRandomChallenge() {
  return SPEAKER_CHALLENGES[Math.floor(Math.random() * SPEAKER_CHALLENGES.length)];
}
