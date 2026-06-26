export type DrillCategory = "Klarowność" | "Tempo" | "Energia" | "Słownictwo" | "Opowiadanie";
export type DrillContentKind = "phrase" | "prompt" | "passage" | "words";

export interface Drill {
  id: string;
  title: string;
  category: DrillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  xp: number;
  description: string;
  instructions: string;
  content: string;
  contentKind: DrillContentKind;
  wordList?: string[];
  completed?: boolean;
  previousScore?: number;
}

export const DRILL_CATEGORIES: ("Wszystkie" | DrillCategory)[] = [
  "Wszystkie",
  "Klarowność",
  "Tempo",
  "Energia",
  "Słownictwo",
  "Opowiadanie",
];

export const DRILLS: Drill[] = [
  // Klarowność
  {
    id: "1",
    title: "Czerwona skóra, żółta skóra",
    category: "Klarowność",
    difficulty: 2,
    xp: 15,
    description: "Klasyczna rozgrzewka artykulacyjna.",
    instructions:
      "Powtórz frazę 5 razy powoli, potem 5 razy w pełnym tempie. Skup się na wyraźnych spółgłoskach — każda litera musi być słyszalna.",
    content: "Czerwona skóra, żółta skóra, czerwona skóra, żółta skóra.",
    contentKind: "phrase",
    completed: true,
    previousScore: 82,
  },
  {
    id: "2",
    title: "Szósty szejk",
    category: "Klarowność",
    difficulty: 4,
    xp: 30,
    description: "Opanuj syczące pod presją.",
    instructions:
      "Powiedz frazę 3 razy z rzędu bez zwalniania. Jeśli się potkniesz, zacznij od początku. Cel: czyste dźwięki S i SZ.",
    content: "Szósty chory szejk ma szóstą chorą owcę.",
    contentKind: "phrase",
  },
  {
    id: "3",
    title: "Wyraźne spółgłoski",
    category: "Klarowność",
    difficulty: 1,
    xp: 10,
    description: "Otwórz usta szerzej niż normalnie.",
    instructions:
      "Przeczytaj frazę na głos, przesadzając z każdą spółgłoską. Nagraj się i posłuchaj — czy słyszysz każdą literę?",
    content: "Lepsze masło robi lepsze ciasto.",
    contentKind: "phrase",
    completed: true,
    previousScore: 91,
  },

  // Tempo
  {
    id: "4",
    title: "60-sekundowy pitch",
    category: "Tempo",
    difficulty: 3,
    xp: 25,
    description: "Traf dokładnie w 60 sekund. Ani więcej, ani mniej.",
    instructions:
      "Zaprezentuj dowolny produkt, pomysł lub siebie w dokładnie 60 sekund. Cel: 140–150 słów/min. Zegar to twoja tablica wyników.",
    content: "Zaprezentuj najbardziej niedocenianą umiejętność następnej dekady i dlaczego każdy powinien się jej nauczyć.",
    contentKind: "prompt",
  },
  {
    id: "5",
    title: "Czytaj jak Lincoln",
    category: "Tempo",
    difficulty: 2,
    xp: 20,
    description: "Wolno, celowo, z wagą.",
    instructions:
      "Przeczytaj fragment w tempie 110–120 słów/min. Używaj pełnych pauz między zdaniami. Pozwól każdej klauzuli oddychać.",
    content:
      "Cztery wyniki i siedem lat temu nasi ojcowie stworzyli na tym kontynencie nowy naród, poczęty w wolności i poświęcony twierdzeniu, że wszyscy ludzie są stworzeni równi.",
    contentKind: "passage",
    completed: true,
    previousScore: 76,
  },
  {
    id: "6",
    title: "Zmiana tempa",
    category: "Tempo",
    difficulty: 5,
    xp: 40,
    description: "Zmień bieg w połowie zdania.",
    instructions:
      "Przeczytaj fragment dwa razy. Pierwsze przejście: wolno i poważnie (100 słów/min). Drugie przejście: pilnie i szybko (180 słów/min). Te same słowa, różne światy.",
    content:
      "Mamy wybór. Możemy czekać, obserwować i zastanawiać się, co mogło być — albo możemy działać, właśnie teraz, dzisiaj, zanim moment wymknie się przez nasze palce.",
    contentKind: "passage",
  },

  // Energia
  {
    id: "7",
    title: "Okrzyk wiecu",
    category: "Energia",
    difficulty: 4,
    xp: 35,
    description: "Obudź stadion swoim głosem.",
    instructions:
      "Wygłoś prompt, jakbyś przemawiał do 50 000 ludzi. Projektuj z przepony. Zmieniaj wysokość dramatycznie.",
    content: "Przekonaj zmęczony tłum, że następne 12 miesięcy wszystko zmieni — jeśli zdecydują właśnie teraz.",
    contentKind: "prompt",
  },
  {
    id: "8",
    title: "Od szeptu do ryku",
    category: "Energia",
    difficulty: 3,
    xp: 25,
    description: "Trening dynamicznego zakresu.",
    instructions:
      "Przeczytaj fragment zaczynając od niemal szeptu i narastaj do pełnej głośności przy ostatnim słowie. Płynnie, kontrolowanie.",
    content:
      "Zaczęło się jako myśl. Potem pytanie. Potem cicha decyzja. Potem plan. Potem ruch. Potem ogień, którego nic nie mogło ugasić.",
    contentKind: "passage",
    completed: true,
    previousScore: 88,
  },
  {
    id: "9",
    title: "Uśmiechaj się przez to",
    category: "Energia",
    difficulty: 1,
    xp: 10,
    description: "Ciepło zmienia brzmienie twojego głosu.",
    instructions:
      "Przeczytaj prompt na głos, fizycznie uśmiechając się przez cały czas. Posłuchaj różnicy. Energia jest zaraźliwa.",
    content: "Powiedz obcej osobie, dlaczego dzisiejszy dzień będzie jednym z najlepszych dni w ich roku.",
    contentKind: "prompt",
  },

  // Słownictwo
  {
    id: "10",
    title: "Wykuj zdanie — Zestaw A",
    category: "Słownictwo",
    difficulty: 3,
    xp: 25,
    description: "Pięć słów, jedna spójna myśl.",
    instructions:
      "Użyj wszystkich pięciu słów w jednym, naturalnie brzmiącym zdaniu. Bez list. Bez oszukiwania. Wypowiedz to na głos.",
    content: "Zbuduj jedno zdanie używając każdego słowa poniżej.",
    contentKind: "words",
    wordList: ["katalizator", "próg", "celowy", "kruchy", "horyzont"],
  },
  {
    id: "11",
    title: "Wykuj zdanie — Zestaw B",
    category: "Słownictwo",
    difficulty: 4,
    xp: 30,
    description: "Ostrzejsze słowa. Wyższa stawka.",
    instructions:
      "Skonstruuj dwa powiązane zdania, które używają wszystkich słów poniżej. Twoja wypowiedź powinna brzmieć jak przygotowane uwagi.",
    content: "Zbuduj dwa powiązane zdania używając każdego słowa poniżej.",
    contentKind: "words",
    wordList: ["paradoks", "dziedzictwo", "świetlisty", "wykuć", "rozrachunek"],
    completed: true,
    previousScore: 79,
  },
  {
    id: "12",
    title: "Banowanie słów",
    category: "Słownictwo",
    difficulty: 5,
    xp: 40,
    description: "Mów przez 90 sekund bez jednego wypełniacza.",
    instructions:
      "Mów o temacie przez 90 sekund. Zakazane słowa: 'eee', 'yyy', 'no', 'w sumie', 'dosłownie', 'wiesz'. Jedno potknięcie, jedna kara.",
    content: "Jaka jest najważniejsza lekcja, jakiej nauczyła cię porażka?",
    contentKind: "prompt",
  },

  // Opowiadanie
  {
    id: "13",
    title: "60-sekundowe pochodzenie",
    category: "Opowiadanie",
    difficulty: 2,
    xp: 20,
    description: "Haczyk, konflikt, zwrot, lekcja — w jedną minutę.",
    instructions:
      "Opowiedz prawdziwą 60-sekundową historię ze swojego życia, która podąża za czterema taktami: haczyk, konflikt, zwrot, lekcja. Zmierz czas.",
    content: "Opowiedz historię momentu, w którym zdałeś sobie sprawę, że myliłeś się w czymś ważnym.",
    contentKind: "prompt",
    completed: true,
    previousScore: 84,
  },
  {
    id: "14",
    title: "Pokaż, nie mów",
    category: "Opowiadanie",
    difficulty: 3,
    xp: 25,
    description: "Namaluj scenę. Żadnych abstrakcji.",
    instructions:
      "Opowiedz historię używając tylko konkretnych szczegółów zmysłowych — widoków, dźwięków, tekstur. Zakazane: 'niesamowity', 'niewiarygodny', 'świetny', 'super'.",
    content: "Opisz pokój, w którym podjęto ważną decyzję w twoim życiu.",
    contentKind: "prompt",
  },
  {
    id: "15",
    title: "Trzyaktowy zwrot",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 45,
    description: "Wprowadzenie, eskalacja, odwrócenie — poniżej 2 minut.",
    instructions:
      "Zbuduj prawdziwą historię z wyraźnym wprowadzeniem, eskalującym problemem i zaskakującym odwróceniem. Wyląduj na zakończeniu. Limit czasu: 2 minuty.",
    content: "Opowiedz historię czasu, gdy wszystko szło dobrze — aż przestało — i co zrobiłeś dalej.",
    contentKind: "prompt",
  },
];

// Deterministyczny dzienny wybór na podstawie daty
export function getFeaturedDrill(): Drill {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % DRILLS.length;
  return DRILLS[idx];
}

export function getDrillById(id: string): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
}
