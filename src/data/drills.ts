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

  // ---------------------------------------------------------------------
  // Rozszerzony zestaw — 50 nowych ćwiczeń
  // ---------------------------------------------------------------------

  // Klarowność (16–29)
  {
    id: "16",
    title: "Stół z powyłamywanymi nogami",
    category: "Klarowność",
    difficulty: 3,
    xp: 25,
    description: "Król polskich łamańców językowych.",
    instructions:
      "Powiedz frazę 5 razy: pierwsze 2 razy bardzo wolno, sylaba po sylabie, potem przyspieszaj. Ani jednego zlepionego wyrazu.",
    content: "Stół z powyłamywanymi nogami stoi w pokoju z powywieszanymi obrazami.",
    contentKind: "phrase",
  },
  {
    id: "17",
    title: "Chrząszcz w Szczebrzeszynie",
    category: "Klarowność",
    difficulty: 4,
    xp: 30,
    description: "Test na spółgłoski szumiące pod presją.",
    instructions:
      "3 czyste przejścia z rzędu. Potknięcie = licznik od zera. Trzymaj szczękę luźno, język aktywny.",
    content: "W Szczebrzeszynie chrząszcz brzmi w trzcinie i Szczebrzeszyn z tego słynie.",
    contentKind: "phrase",
  },
  {
    id: "18",
    title: "Korek na końcu",
    category: "Klarowność",
    difficulty: 2,
    xp: 15,
    description: "Nie zjadaj ostatniej sylaby.",
    instructions:
      "Przeczytaj zdania, przesadnie kończąc każde słowo. Nagraj się i sprawdź, czy końcówki są słyszalne.",
    content: "Zrobiliśmy to szybko, dokładnie i skutecznie. Wszyscy zrozumieli, wszyscy zapamiętali.",
    contentKind: "passage",
  },
  {
    id: "19",
    title: "Korek w zębach",
    category: "Klarowność",
    difficulty: 3,
    xp: 25,
    description: "Klasyk aktorskiej rozgrzewki.",
    instructions:
      "Włóż korek (lub kciuk) między zęby i przeczytaj tekst 2 razy. Potem wyjmij i przeczytaj raz normalnie — usłyszysz różnicę.",
    content: "Precyzja wymowy to nie ozdoba, to podstawa. Kto mówi wyraźnie, tego się słucha.",
    contentKind: "passage",
  },
  {
    id: "20",
    title: "Samogłoski otwarte",
    category: "Klarowność",
    difficulty: 1,
    xp: 10,
    description: "A-E-I-O-U na pełnej rezonacji.",
    instructions:
      "Wypowiedz sekwencję 6 razy, za każdym razem szerzej otwierając usta. Utrzymaj równą głośność do końca serii.",
    content: "MA ME MI MO MU · BA BE BI BO BU · LA LE LI LO LU",
    contentKind: "phrase",
  },
  {
    id: "21",
    title: "Trzy trudne T",
    category: "Klarowność",
    difficulty: 3,
    xp: 20,
    description: "Ostre, czyste plozywne.",
    instructions:
      "Każde T ma być słyszalnym uderzeniem. 4 powtórzenia, tempo rosnące.",
    content: "Trzy tłuste tetryki tłukły tłuczkiem trzysta twardych trufli.",
    contentKind: "phrase",
  },
  {
    id: "22",
    title: "Rozdziel R",
    category: "Klarowność",
    difficulty: 4,
    xp: 30,
    description: "Wibracja języka bez napięcia gardła.",
    instructions:
      "Zacznij od przedłużonego 'rrr', potem wejdź w zdanie. Gardło luźne, pracuje tylko czubek języka.",
    content: "Rewelacyjny rzeźbiarz rzeźbił rzadkie rzeźby w rozgrzanym marmurze.",
    contentKind: "phrase",
  },
  {
    id: "23",
    title: "Ciche kończenie zdań",
    category: "Klarowność",
    difficulty: 2,
    xp: 20,
    description: "Wielu ludzi ginie na ostatnich trzech słowach.",
    instructions:
      "Przeczytaj akapit, celowo zwiększając głośność na ostatnich trzech słowach każdego zdania.",
    content:
      "Nikt nie kupi pomysłu, którego nie usłyszał. Nikt nie zapamięta puenty, która zniknęła w mruknięciu. Kończ mocno.",
    contentKind: "passage",
  },
  {
    id: "24",
    title: "Nosowe ą i ę",
    category: "Klarowność",
    difficulty: 3,
    xp: 25,
    description: "Polska specjalność, którą łatwo zjeść.",
    instructions:
      "Przeczytaj tekst dwa razy, wybrzmiewając każde ą i ę w pełni. Bez skracania do 'o' i 'e'.",
    content: "Idą święta, będę wędrował ścieżką wąską, między gęstymi gałęziami, w mądrym milczeniu.",
    contentKind: "passage",
  },
  {
    id: "25",
    title: "Mowa przy ścianie",
    category: "Klarowność",
    difficulty: 2,
    xp: 15,
    description: "Feedback akustyczny w 60 sekund.",
    instructions:
      "Stań 30 cm od ściany i mów do niej. Słyszysz każde swoje zniekształcenie. Popraw w locie.",
    content: "Opowiedz, co robiłeś w ostatni weekend — pełnymi, wyraźnymi zdaniami.",
    contentKind: "prompt",
  },
  {
    id: "26",
    title: "Sylaba po sylabie",
    category: "Klarowność",
    difficulty: 1,
    xp: 10,
    description: "Rozbij słowo na atomy.",
    instructions:
      "Przeczytaj listę, dzieląc każde słowo na sylaby z równym akcentem, potem połącz w normalne tempo.",
    content: "Rozdziel każde słowo na sylaby, potem powiedz je płynnie.",
    contentKind: "words",
    wordList: [
      "przedsiębiorczość",
      "współodpowiedzialność",
      "nieprzewidywalność",
      "usprawiedliwienie",
      "charakterystyczny",
    ],
  },
  {
    id: "27",
    title: "Bez zaciśniętej szczęki",
    category: "Klarowność",
    difficulty: 2,
    xp: 15,
    description: "Napięcie w żuchwie zjada dykcję.",
    instructions:
      "Rozmasuj żuchwę 20 sekund, ziewnij 3 razy, dopiero potem czytaj. Zauważ, jak zmienia się rezonans.",
    content: "Głos, który jest swobodny, brzmi na pewny. Głos zaciśnięty brzmi na wystraszony.",
    contentKind: "passage",
  },
  {
    id: "28",
    title: "Numery pod presją",
    category: "Klarowność",
    difficulty: 3,
    xp: 25,
    description: "Liczby to test precyzji.",
    instructions:
      "Przeczytaj na głos, wyraźnie i bez pomyłki. Liczby wypowiadaj pełnymi słowami.",
    content: "347 klientów, 82% konwersji, 1 293 zł średniej wartości koszyka, 15 dni testu.",
    contentKind: "passage",
  },
  {
    id: "29",
    title: "Szept, który słychać",
    category: "Klarowność",
    difficulty: 4,
    xp: 30,
    description: "Artykulacja bez głośności.",
    instructions:
      "Wypowiedz tekst szeptem tak wyraźnie, żeby dało się go zrozumieć z drugiego końca pokoju. Pracują tylko usta i język.",
    content: "Cisza też potrafi być stanowcza. Wystarczy, że każde słowo jest wykute do końca.",
    contentKind: "passage",
  },

  // Tempo (30–39)
  {
    id: "30",
    title: "Metronom 120",
    category: "Tempo",
    difficulty: 2,
    xp: 20,
    description: "Stałe, dostojne tempo.",
    instructions:
      "Utrzymaj 115–125 słów na minutę przez całe czytanie. Bez przyspieszania na końcu.",
    content:
      "Dobre tempo to nie wolno ani szybko. To takie, przy którym słuchacz nadąża bez wysiłku, a ty nadal brzmisz na zdecydowanego.",
    contentKind: "passage",
  },
  {
    id: "31",
    title: "Pauza po puencie",
    category: "Tempo",
    difficulty: 3,
    xp: 25,
    description: "Cisza sprzedaje mocniej niż słowa.",
    instructions:
      "Po każdym zdaniu zrób pełne 2 sekundy ciszy. Policz w głowie. Nie wypełniaj przerwy dźwiękiem.",
    content: "To nie był przypadek. To był wybór. I kosztował wszystko, co miałem.",
    contentKind: "passage",
  },
  {
    id: "32",
    title: "30 sekund, jedna myśl",
    category: "Tempo",
    difficulty: 3,
    xp: 25,
    description: "Kompresja bez utraty sensu.",
    instructions:
      "Odpowiedz w dokładnie 30 sekund. Nie 25, nie 40. Jedna teza, dwa argumenty, jedno domknięcie.",
    content: "Dlaczego warto robić trudne rzeczy, zanim poczujesz się gotowy?",
    contentKind: "prompt",
  },
  {
    id: "33",
    title: "Zwolnij na liczbach",
    category: "Tempo",
    difficulty: 2,
    xp: 20,
    description: "Dane potrzebują powietrza.",
    instructions:
      "Czytaj normalnie, ale przy każdej liczbie zwolnij o połowę i zrób krótką pauzę po niej.",
    content:
      "W pierwszym kwartale urosliśmy o 41 procent. W drugim o 63. A koszt pozyskania klienta spadł o jedną trzecią.",
    contentKind: "passage",
  },
  {
    id: "34",
    title: "Sprint 180",
    category: "Tempo",
    difficulty: 4,
    xp: 30,
    description: "Szybko, ale wciąż zrozumiale.",
    instructions:
      "Przeczytaj w tempie ok. 180 słów/min bez gubienia końcówek. Jeśli coś zlepiłeś — powtórz od nowa.",
    content:
      "Nie mamy czasu na rozgrzewkę, nie mamy czasu na wymówki, nie mamy czasu na kolejne spotkanie o spotkaniu — mamy jeden dzień i jedną decyzję.",
    contentKind: "passage",
  },
  {
    id: "35",
    title: "Trzy pauzy dramatyczne",
    category: "Tempo",
    difficulty: 3,
    xp: 25,
    description: "Zaplanuj ciszę jak nutę.",
    instructions:
      "Zaznacz sobie trzy miejsca w tekście i zrób w nich 3-sekundowe pauzy. Reszta w normalnym tempie.",
    content:
      "Myślałem, że problem leży w rynku. Sprawdziłem dane. Problem leżał we mnie. I to była najlepsza wiadomość tamtego roku.",
    contentKind: "passage",
  },
  {
    id: "36",
    title: "Oddech co dwa zdania",
    category: "Tempo",
    difficulty: 2,
    xp: 15,
    description: "Przepona zamiast klatki.",
    instructions:
      "Bierz świadomy, głęboki wdech co dwa zdania. Nie mów na resztkach powietrza.",
    content:
      "Zacząłem od zera. Nie miałem listy kontaktów. Dzwoniłem na zimno przez sześć miesięcy. Pierwszy klient przyszedł w tygodniu dwudziestym trzecim.",
    contentKind: "passage",
  },
  {
    id: "37",
    title: "Antywypełniacz: cisza zamiast 'eee'",
    category: "Tempo",
    difficulty: 4,
    xp: 35,
    description: "Zamień dźwięk niepewności na pauzę pewności.",
    instructions:
      "Mów 60 sekund. Za każdym razem, gdy chcesz powiedzieć 'eee' — zamilcz na sekundę. Cisza jest dozwolona, dźwięk nie.",
    content: "Wyjaśnij komuś, na czym polega twoja praca, tak żeby zrozumiało to dziecko.",
    contentKind: "prompt",
  },
  {
    id: "38",
    title: "Rytm trójki",
    category: "Tempo",
    difficulty: 3,
    xp: 25,
    description: "Trzy takty, narastające tempo.",
    instructions:
      "Każdą trójkę mów z rosnącym tempem i lekko rosnącą głośnością. Ostatni element — mocne lądowanie.",
    content: "Przygotuj się. Zdecyduj. Działaj. · Zauważ. Nazwij. Zmień. · Mniej mów. Więcej słuchaj. Lepiej pytaj.",
    contentKind: "passage",
  },
  {
    id: "39",
    title: "Odpowiedź w 3 zdaniach",
    category: "Tempo",
    difficulty: 3,
    xp: 25,
    description: "Zwięzłość jako nawyk.",
    instructions:
      "Odpowiedz dokładnie trzema zdaniami: teza, dowód, wniosek. Ani jednego słowa więcej.",
    content: "Dlaczego ktoś miałby wybrać właśnie ciebie?",
    contentKind: "prompt",
  },

  // Energia (40–48)
  {
    id: "40",
    title: "Zakres wysokości",
    category: "Energia",
    difficulty: 3,
    xp: 25,
    description: "Wyjdź z monotonii.",
    instructions:
      "Przeczytaj tekst trzy razy: raz nisko, raz wysoko, raz mieszając wysokości w obrębie zdania.",
    content: "Nie chodzi o to, żeby mówić głośniej. Chodzi o to, żeby mówić ciekawiej.",
    contentKind: "passage",
  },
  {
    id: "41",
    title: "Akcent na jedno słowo",
    category: "Energia",
    difficulty: 2,
    xp: 20,
    description: "To samo zdanie, pięć znaczeń.",
    instructions:
      "Powiedz zdanie pięć razy, za każdym razem akcentując inne słowo. Usłysz, jak zmienia się sens.",
    content: "Ja nigdy nie mówiłem, że to jego wina.",
    contentKind: "phrase",
  },
  {
    id: "42",
    title: "Uśmiech w głosie przez telefon",
    category: "Energia",
    difficulty: 1,
    xp: 10,
    description: "Ciepło słychać nawet bez obrazu.",
    instructions:
      "Wypowiedz powitanie 5 razy: neutralnie, z uśmiechem, z szerokim uśmiechem. Porównaj nagrania.",
    content: "Dzień dobry, tu Kamil — cieszę się, że udało nam się złapać.",
    contentKind: "phrase",
  },
  {
    id: "43",
    title: "Ostatnie zdanie na maksa",
    category: "Energia",
    difficulty: 3,
    xp: 25,
    description: "Zakończenie decyduje o zapamiętaniu.",
    instructions:
      "Czytaj spokojnie, a ostatnie zdanie wygłoś z pełnym zaangażowaniem i wolniej.",
    content:
      "Możemy analizować to jeszcze miesiąc. Możemy zrobić kolejny research. Albo możemy zacząć jutro rano i mieć wynik za dwa tygodnie.",
    contentKind: "passage",
  },
  {
    id: "44",
    title: "Rozgrzewka przepony",
    category: "Energia",
    difficulty: 1,
    xp: 10,
    description: "Głos zaczyna się poniżej żeber.",
    instructions:
      "Wykonaj 10 krótkich 'ha!' z brzucha, potem przeczytaj zdanie na jednym oddechu z pełną projekcją.",
    content: "Mój głos ma nośność, moje słowa mają wagę, moja obecność ma kierunek.",
    contentKind: "phrase",
  },
  {
    id: "45",
    title: "Zła wiadomość, spokojny głos",
    category: "Energia",
    difficulty: 4,
    xp: 30,
    description: "Kontrola emocji pod presją.",
    instructions:
      "Przekaż trudną informację nisko, wolno i spokojnie. Zero przepraszającego tonu, zero podnoszenia głosu.",
    content: "Powiedz zespołowi, że projekt, nad którym pracowali trzy miesiące, zostaje wstrzymany.",
    contentKind: "prompt",
  },
  {
    id: "46",
    title: "Entuzjazm bez krzyku",
    category: "Energia",
    difficulty: 3,
    xp: 25,
    description: "Energia z tempa i wysokości, nie z decybeli.",
    instructions:
      "Wypowiedz prompt z pełnym entuzjazmem, ale nie przekraczając normalnej głośności rozmowy.",
    content: "Opowiedz o rzeczy, którą ostatnio odkryłeś i która naprawdę cię wciągnęła.",
    contentKind: "prompt",
  },
  {
    id: "47",
    title: "Cztery emocje, jedno zdanie",
    category: "Energia",
    difficulty: 4,
    xp: 30,
    description: "Aktorski trening barwy.",
    instructions:
      "Powiedz zdanie cztery razy: z ekscytacją, z rozczarowaniem, z ironią, z powagą.",
    content: "No i proszę, dokładnie tego się spodziewałem.",
    contentKind: "phrase",
  },
  {
    id: "48",
    title: "Otwarcie, które zatrzymuje",
    category: "Energia",
    difficulty: 5,
    xp: 40,
    description: "Pierwsze 10 sekund decyduje o reszcie.",
    instructions:
      "Nagraj 10-sekundowe otwarcie wystąpienia. Bez 'dzień dobry, nazywam się'. Od razu w sedno, z pełną energią.",
    content: "Otwórz wystąpienie o temacie, na którym naprawdę ci zależy — masz 10 sekund.",
    contentKind: "prompt",
  },

  // Słownictwo (49–56)
  {
    id: "49",
    title: "Bez 'fajnie' i 'super'",
    category: "Słownictwo",
    difficulty: 3,
    xp: 25,
    description: "Wymuś precyzję zamiast ogólników.",
    instructions:
      "Mów 60 sekund. Zakazane: fajnie, super, ciekawe, dobre, spoko. Zamiast tego — konkret.",
    content: "Opisz ostatnią rzecz, która zrobiła na tobie wrażenie.",
    contentKind: "prompt",
  },
  {
    id: "50",
    title: "Synonimy na żądanie",
    category: "Słownictwo",
    difficulty: 2,
    xp: 20,
    description: "Rozbuduj repertuar w 2 minuty.",
    instructions:
      "Do każdego słowa podaj na głos 4 synonimy i użyj jednego w pełnym zdaniu.",
    content: "Podaj cztery synonimy do każdego słowa i zbuduj z jednym z nich zdanie.",
    contentKind: "words",
    wordList: ["ważny", "trudny", "szybki", "duży", "zmiana"],
  },
  {
    id: "51",
    title: "Metafora na zawołanie",
    category: "Słownictwo",
    difficulty: 4,
    xp: 30,
    description: "Obraz zamiast definicji.",
    instructions:
      "Wyjaśnij każde pojęcie jedną metaforą z życia codziennego. Bez żargonu.",
    content: "Wyjaśnij metaforą: inflacja, procent składany, dług technologiczny, wypalenie.",
    contentKind: "prompt",
  },
  {
    id: "52",
    title: "Wykuj zdanie — Zestaw C",
    category: "Słownictwo",
    difficulty: 4,
    xp: 30,
    description: "Trudne słowa, naturalne brzmienie.",
    instructions:
      "Zbuduj dwa zdania używające wszystkich słów. Ma brzmieć jak mowa, nie jak lista.",
    content: "Zbuduj dwa zdania używające każdego słowa poniżej.",
    contentKind: "words",
    wordList: ["konsekwencja", "asymetria", "dźwignia", "przeoczenie", "przełom"],
  },
  {
    id: "53",
    title: "Język korzyści",
    category: "Słownictwo",
    difficulty: 3,
    xp: 25,
    description: "Zamień cechy na skutki dla odbiorcy.",
    instructions:
      "Do każdej cechy powiedz na głos zdanie w formie: 'co to oznacza dla ciebie'.",
    content: "Cechy: 12-miesięczna gwarancja, aplikacja mobilna, wsparcie 24/7, integracja z kalendarzem.",
    contentKind: "prompt",
  },
  {
    id: "54",
    title: "Bez strony biernej",
    category: "Słownictwo",
    difficulty: 3,
    xp: 25,
    description: "Czasowniki aktywne budują autorytet.",
    instructions:
      "Opowiedz o projekcie przez 60 sekund używając tylko strony czynnej. Żadnego 'zostało zrobione'.",
    content: "Opowiedz o czymś, co ostatnio zbudowałeś albo doprowadziłeś do końca.",
    contentKind: "prompt",
  },
  {
    id: "55",
    title: "Jedno słowo, trzy poziomy",
    category: "Słownictwo",
    difficulty: 2,
    xp: 20,
    description: "Precyzja skali.",
    instructions:
      "Dla każdego słowa podaj wersję słabszą, neutralną i mocniejszą, i użyj każdej w zdaniu.",
    content: "Wypowiedz trzy poziomy intensywności dla każdego słowa.",
    contentKind: "words",
    wordList: ["zły", "zadowolony", "zmęczony", "pewny", "zaskoczony"],
  },
  {
    id: "56",
    title: "Żargon out",
    category: "Słownictwo",
    difficulty: 4,
    xp: 30,
    description: "Tłumacz branżowy na ludzki.",
    instructions:
      "Wyjaśnij swój obszar pracy przez 90 sekund bez ani jednego słowa branżowego.",
    content: "Wytłumacz, czym się zajmujesz, osobie spoza twojej branży.",
    contentKind: "prompt",
  },

  // Opowiadanie (57–65)
  {
    id: "57",
    title: "Haczyk w 7 sekund",
    category: "Opowiadanie",
    difficulty: 3,
    xp: 25,
    description: "Pierwsze zdanie musi zaciekawić.",
    instructions:
      "Nagraj 5 różnych pierwszych zdań tej samej historii. Wybierz najmocniejsze i powtórz je.",
    content: "Wymyśl 5 różnych otwarć historii o dniu, w którym coś poszło zupełnie nie tak.",
    contentKind: "prompt",
  },
  {
    id: "58",
    title: "Struktura STAR",
    category: "Opowiadanie",
    difficulty: 3,
    xp: 25,
    description: "Sytuacja, Zadanie, Działanie, Rezultat.",
    instructions:
      "Opowiedz historię w czterech taktach STAR, po 20–25 sekund na każdy. Rezultat musi być konkretny i mierzalny.",
    content: "Opowiedz o sytuacji, w której rozwiązałeś problem, którego nikt inny nie chciał tknąć.",
    contentKind: "prompt",
  },
  {
    id: "59",
    title: "Historia bez przymiotników",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 40,
    description: "Czasowniki niosą narrację.",
    instructions:
      "Opowiedz 60-sekundową historię bez ani jednego przymiotnika. Tylko rzeczowniki i czasowniki.",
    content: "Opowiedz o pierwszym dniu w nowym miejscu — pracy, szkole albo mieście.",
    contentKind: "prompt",
  },
  {
    id: "60",
    title: "Dialog w historii",
    category: "Opowiadanie",
    difficulty: 4,
    xp: 30,
    description: "Ożyw postaci głosem.",
    instructions:
      "Wpleć minimum trzy wypowiedzi w cudzysłowie i zmieniaj barwę głosu dla każdej postaci.",
    content: "Opowiedz historię rozmowy, która zmieniła twoje zdanie w ważnej sprawie.",
    contentKind: "prompt",
  },
  {
    id: "61",
    title: "Puenta najpierw",
    category: "Opowiadanie",
    difficulty: 3,
    xp: 25,
    description: "Odwrócona piramida.",
    instructions:
      "Zacznij od wniosku, potem opowiedz historię, która do niego doprowadziła. 60 sekund.",
    content: "Zacznij od zdania: 'Najdroższa lekcja, jaką dostałem, kosztowała mnie...' i rozwiń.",
    contentKind: "prompt",
  },
  {
    id: "62",
    title: "Jeden szczegół zmysłowy",
    category: "Opowiadanie",
    difficulty: 2,
    xp: 20,
    description: "Detal robi scenę wiarygodną.",
    instructions:
      "W każdym z trzech taktów historii umieść jeden konkretny szczegół: zapach, dźwięk albo fakturę.",
    content: "Opowiedz o miejscu, do którego chciałbyś wrócić choć na godzinę.",
    contentKind: "prompt",
  },
  {
    id: "63",
    title: "Stawka i konsekwencje",
    category: "Opowiadanie",
    difficulty: 4,
    xp: 30,
    description: "Bez ryzyka nie ma napięcia.",
    instructions:
      "W ciągu pierwszych 15 sekund powiedz wprost, co można było stracić. Potem eskaluj.",
    content: "Opowiedz o decyzji, przy której naprawdę coś było na szali.",
    contentKind: "prompt",
  },
  {
    id: "64",
    title: "Historia w 20 sekund",
    category: "Opowiadanie",
    difficulty: 4,
    xp: 30,
    description: "Kompresja do esencji.",
    instructions:
      "Opowiedz pełną historię — początek, zwrot, koniec — w 20 sekund. Potem zrób to jeszcze raz w 15.",
    content: "Opowiedz najzabawniejszą rzecz, jaka przydarzyła ci się w ostatnim roku.",
    contentKind: "prompt",
  },
  {
    id: "65",
    title: "Most do wniosku",
    category: "Opowiadanie",
    difficulty: 3,
    xp: 25,
    description: "Historia bez lekcji to anegdota.",
    instructions:
      "Opowiedz 45-sekundową historię i zakończ jednym zdaniem, które przekłada ją na uniwersalną zasadę.",
    content: "Opowiedz o momencie, w którym ktoś dał ci radę, którą zrozumiałeś dopiero lata później.",
    contentKind: "prompt",
  },

  // ---------------------------------------------------------------------
  // EKSTREMALNE — 30 zadań o najwyższej trudności (66–95)
  // ---------------------------------------------------------------------

  // Klarowność — ekstremalna
  {
    id: "66",
    title: "Król Karol kupił królowej",
    category: "Klarowność",
    difficulty: 5,
    xp: 50,
    description: "Łamaniec, który łamie większość ludzi.",
    instructions:
      "5 czystych przejść z rzędu, każde szybsze od poprzedniego. Jedno potknięcie — licznik wraca do zera. Bez zwalniania na końcówkach.",
    content:
      "Król Karol kupił królowej Karolinie korale koloru koralowego, a królowa Karolina kupiła królowi Karolowi korale koloru karmazynowego.",
    contentKind: "phrase",
  },
  {
    id: "67",
    title: "Trzy tysiące trzysta trzydzieści trzy",
    category: "Klarowność",
    difficulty: 5,
    xp: 50,
    description: "Test na 'trz' i 'strz' bez litości.",
    instructions:
      "Powiedz frazę 4 razy bez ani jednej uproszczonej zbitki. Każde 'trz' musi mieć trzy oddzielne dźwięki.",
    content:
      "Trzy tysiące trzysta trzydzieści trzy trzmiele trzepotały nad strzechą, a strzelec strzelał w trzcinę.",
    contentKind: "phrase",
  },
  {
    id: "68",
    title: "Kaskada zbitek",
    category: "Klarowność",
    difficulty: 5,
    xp: 55,
    description: "Sześć najtrudniejszych zbitek pod rząd.",
    instructions:
      "Jedno przejście na jednym oddechu, bez dobierania powietrza. Potem drugie — o 30% szybciej.",
    content:
      "Zdżdżysty zmierzch, przeszczep, wszczepienie, źdźbło, bezwzględność, wszechstronność — i jeszcze raz od początku.",
    contentKind: "phrase",
  },
  {
    id: "69",
    title: "Terminologia bez potknięć",
    category: "Klarowność",
    difficulty: 5,
    xp: 50,
    description: "Długie słowa w pełnym tempie.",
    instructions:
      "Przeczytaj listę trzy razy w tempie konwersacyjnym. Każde słowo w całości, bez skracania sylab.",
    content: "Przeczytaj każde słowo płynnie, w normalnym tempie mowy.",
    contentKind: "words",
    wordList: [
      "konstantynopolitańczykowianeczka",
      "nieprawdopodobieństwo",
      "międzynarodowość",
      "wielkopolszczyzna",
      "sprawiedliwościowy",
    ],
  },
  {
    id: "70",
    title: "Ołówek między zębami — pełny tekst",
    category: "Klarowność",
    difficulty: 5,
    xp: 55,
    description: "Maksymalne obciążenie aparatu mowy.",
    instructions:
      "Włóż ołówek poziomo między zęby i przeczytaj cały akapit zrozumiale. Potem wyjmij i przeczytaj raz jeszcze — nagraj oba przejścia i porównaj.",
    content:
      "Precyzja artykulacji nie bierze się z talentu. Bierze się z tysiąca powtórzeń wykonanych wtedy, kiedy nikt nie patrzy, i z odwagi, żeby usłyszeć własne nagranie do końca.",
    contentKind: "passage",
  },
  {
    id: "71",
    title: "Szept sceniczny 90 sekund",
    category: "Klarowność",
    difficulty: 5,
    xp: 50,
    description: "Zero głosu, pełna zrozumiałość.",
    instructions:
      "Mów 90 sekund wyłącznie szeptem, ale tak wyraźnie, żeby transkrypcja była bezbłędna. Bez przechodzenia w głos.",
    content: "Wytłumacz, jak podejmujesz najtrudniejsze decyzje w swoim życiu.",
    contentKind: "prompt",
  },

  // Tempo — ekstremalne
  {
    id: "72",
    title: "Sprint 220 słów na minutę",
    category: "Tempo",
    difficulty: 5,
    xp: 55,
    description: "Granica ludzkiej zrozumiałości.",
    instructions:
      "Przeczytaj tekst w tempie ok. 220 słów/min zachowując wszystkie końcówki. Jeśli cokolwiek się zlepi — całość od nowa.",
    content:
      "Nie ma idealnego momentu, nie ma pełnej informacji, nie ma gwarancji zwrotu, nie ma cudzej zgody, nie ma drugiej takiej okazji — jest tylko decyzja, którą podejmujesz teraz, i konsekwencje, które udźwigniesz jutro.",
    contentKind: "passage",
  },
  {
    id: "73",
    title: "Zero wypełniaczy przez 3 minuty",
    category: "Tempo",
    difficulty: 5,
    xp: 60,
    description: "Najtrudniejszy test dyscypliny mowy.",
    instructions:
      "Mów 3 minuty bez ani jednego: eee, yyy, no, znaczy, jakby, w sumie, tak jakby, wiesz. Jedno potknięcie = restart całego ćwiczenia.",
    content: "Opowiedz o swojej największej porażce zawodowej i o tym, co konkretnie zmieniłeś po niej.",
    contentKind: "prompt",
  },
  {
    id: "74",
    title: "Metronom bez dryfu",
    category: "Tempo",
    difficulty: 5,
    xp: 50,
    description: "Utrzymaj tempo z dokładnością ±5 słów/min.",
    instructions:
      "Mów 2 minuty utrzymując dokładnie 140 słów/min. Sprawdź w nagraniu, czy drugie 60 sekund nie przyspieszyło.",
    content: "Wyjaśnij od podstaw temat, który znasz najlepiej — tak, żeby nadążył ktoś zupełnie zielony.",
    contentKind: "prompt",
  },
  {
    id: "75",
    title: "Pauza 4 sekundy",
    category: "Tempo",
    difficulty: 5,
    xp: 50,
    description: "Cisza, która boli mówiącego, a pracuje na słuchacza.",
    instructions:
      "Po każdej z trzech kluczowych tez zrób pełne 4 sekundy ciszy. Nie wypełniaj jej niczym — ani dźwiękiem, ani ruchem.",
    content: "Przedstaw trzy tezy, w które naprawdę wierzysz, i po każdej daj im wybrzmieć.",
    contentKind: "prompt",
  },
  {
    id: "76",
    title: "Cztery biegi w jednym tekście",
    category: "Tempo",
    difficulty: 5,
    xp: 55,
    description: "100 → 200 → 130 → 90 słów na minutę.",
    instructions:
      "Podziel tekst na cztery części i każdą wygłoś w innym tempie: 100, 200, 130, 90 słów/min. Przejścia mają być płynne, nie skokowe.",
    content:
      "Na początku wszystko wydawało się spokojne. Potem w ciągu jednego tygodnia posypały się terminy, klienci, zespół i budżet. Zatrzymaliśmy się, spisaliśmy fakty i wybraliśmy jedną rzecz. Ta jedna rzecz uratowała cały rok.",
    contentKind: "passage",
  },
  {
    id: "77",
    title: "Odliczanie wsteczne z narracją",
    category: "Tempo",
    difficulty: 5,
    xp: 50,
    description: "Podzielna uwaga pod presją czasu.",
    instructions:
      "Opowiadaj historię i co 15 sekund wtrącaj kolejną liczbę odliczaną od 100 w dół co 7 (100, 93, 86...). Narracja nie może się rozpaść.",
    content: "Opowiedz historię swojego ostatniego dużego projektu — od pomysłu do rezultatu.",
    contentKind: "prompt",
  },

  // Energia — ekstremalna
  {
    id: "78",
    title: "Od szeptu do ryku i z powrotem",
    category: "Energia",
    difficulty: 5,
    xp: 55,
    description: "Pełny łuk dynamiczny w 60 sekund.",
    instructions:
      "Zacznij szeptem, narastaj do maksymalnej projekcji w połowie, wróć do szeptu na końcu. Bez skoków — ciągła krzywa.",
    content:
      "Zaczęło się od jednej wątpliwości. Rosło. Rosło aż do dnia, w którym nie dało się już udawać, że wszystko jest w porządku. A potem, po wszystkim, została tylko cisza i decyzja.",
    contentKind: "passage",
  },
  {
    id: "79",
    title: "Osiem emocji, jedno zdanie",
    category: "Energia",
    difficulty: 5,
    xp: 55,
    description: "Pełna paleta barwy głosu.",
    instructions:
      "Powiedz zdanie osiem razy: radość, gniew, smutek, ironia, groza, czułość, znużenie, triumf. Każda wersja musi być rozpoznawalna bez kontekstu.",
    content: "I wtedy zrozumiałem, że to już się nie odstanie.",
    contentKind: "phrase",
  },
  {
    id: "80",
    title: "Przemowa na stadion",
    category: "Energia",
    difficulty: 5,
    xp: 60,
    description: "Maksymalna projekcja bez krzyku i bez zdzierania gardła.",
    instructions:
      "90 sekund pełnej projekcji z przepony. Gardło ma pozostać luźne — jeśli chrypisz, robisz to źle. Utrzymaj energię do ostatniego słowa.",
    content: "Przekonaj tysiąc zmęczonych ludzi, że jutro warto wstać i spróbować jeszcze raz.",
    contentKind: "prompt",
  },
  {
    id: "81",
    title: "Zimny spokój pod atakiem",
    category: "Energia",
    difficulty: 5,
    xp: 55,
    description: "Niski rejestr, wolne tempo, zero obrony.",
    instructions:
      "Odpowiedz na ostry zarzut w tonie o oktawę niższym niż zwykle i o 30% wolniej. Bez podnoszenia głosu, bez tłumaczenia się, bez 'przepraszam'.",
    content: "Ktoś publicznie mówi, że twoja praca z ostatniego półrocza była stratą pieniędzy. Odpowiedz.",
    contentKind: "prompt",
  },
  {
    id: "82",
    title: "Energia bez decybeli",
    category: "Energia",
    difficulty: 5,
    xp: 50,
    description: "Porwij salę na poziomie głośności szeptu.",
    instructions:
      "Wygłoś motywującą wypowiedź na stałej, bardzo cichej głośności. Cała energia musi pochodzić z tempa, wysokości i pauz.",
    content: "Przekonaj kogoś, żeby zaczął dziś rzecz, którą odkłada od trzech lat.",
    contentKind: "prompt",
  },
  {
    id: "83",
    title: "Ostatnie 10 sekund",
    category: "Energia",
    difficulty: 5,
    xp: 50,
    description: "Lądowanie, które zostaje w głowie.",
    instructions:
      "Nagraj pięć różnych zakończeń tej samej przemowy, każde dokładnie 10-sekundowe i każde z inną strategią: cisza, pytanie, wezwanie, obraz, powtórzenie.",
    content: "Zakończ przemowę o tym, dlaczego warto podejmować ryzyko, którego inni unikają.",
    contentKind: "prompt",
  },

  // Słownictwo — ekstremalne
  {
    id: "84",
    title: "Wykuj zdanie — Zestaw ekstremalny",
    category: "Słownictwo",
    difficulty: 5,
    xp: 55,
    description: "Siedem trudnych słów, jedno spójne zdanie.",
    instructions:
      "Zbuduj JEDNO zdanie zawierające wszystkie siedem słów, brzmiące naturalnie. Bez wyliczeń i bez sztucznych wtrąceń.",
    content: "Zbuduj jedno naturalne zdanie z wszystkimi słowami poniżej.",
    contentKind: "words",
    wordList: [
      "immanentny",
      "dysonans",
      "arbitralny",
      "eskalacja",
      "przesłanka",
      "nieodwracalność",
      "kompromis",
    ],
  },
  {
    id: "85",
    title: "Zakaz czasownika 'być'",
    category: "Słownictwo",
    difficulty: 5,
    xp: 55,
    description: "Najtrudniejsze ograniczenie językowe.",
    instructions:
      "Mów 90 sekund bez żadnej formy czasownika 'być' (jest, są, było, będzie, byłem...). Wymusza mocne czasowniki.",
    content: "Opisz osobę, która najbardziej wpłynęła na twoje życie.",
    contentKind: "prompt",
  },
  {
    id: "86",
    title: "Tylko krótkie słowa",
    category: "Słownictwo",
    difficulty: 5,
    xp: 50,
    description: "Maksymalnie dwie sylaby na słowo.",
    instructions:
      "Wyjaśnij skomplikowany temat przez 90 sekund używając wyłącznie słów jedno- i dwusylabowych.",
    content: "Wytłumacz, jak działa procent składany i dlaczego zmienia całe życie finansowe.",
    contentKind: "prompt",
  },
  {
    id: "87",
    title: "Trzy poziomy abstrakcji",
    category: "Słownictwo",
    difficulty: 5,
    xp: 55,
    description: "Ten sam temat dla dziecka, laika i eksperta.",
    instructions:
      "Wygłoś trzy wersje po 40 sekund: dla 7-latka, dla inteligentnego laika, dla eksperta. Bez powtarzania tych samych sformułowań.",
    content: "Wyjaśnij, na czym polega ryzyko i jak nim zarządzać.",
    contentKind: "prompt",
  },
  {
    id: "88",
    title: "Bez zaimka 'ja'",
    category: "Słownictwo",
    difficulty: 5,
    xp: 50,
    description: "Przesuń środek ciężkości na odbiorcę.",
    instructions:
      "Opowiedz o swoim osiągnięciu przez 90 sekund bez słowa 'ja', 'mnie', 'mój'. Mów o skutkach dla innych.",
    content: "Opowiedz o rzeczy, z której jesteś najbardziej dumny zawodowo.",
    contentKind: "prompt",
  },
  {
    id: "89",
    title: "Alfabetyczne otwarcia",
    category: "Słownictwo",
    difficulty: 5,
    xp: 55,
    description: "Ekstremalne obciążenie pamięci roboczej.",
    instructions:
      "Wygłoś 10 kolejnych zdań, w których pierwsze słowa zaczynają się na A, B, C, D, E, F, G, H, I, J. Sens musi być zachowany.",
    content: "Opowiedz spójną historię o dniu, który wszystko zmienił.",
    contentKind: "prompt",
  },
  {
    id: "90",
    title: "Definicja bez słowa kluczowego",
    category: "Słownictwo",
    difficulty: 5,
    xp: 50,
    description: "Tabu na najwyższym poziomie.",
    instructions:
      "Wyjaśnij każde pojęcie tak, żeby słuchacz je odgadł — nie używając samego słowa ani jego rdzenia. Po 30 sekund na pojęcie.",
    content: "Pojęcia do wyjaśnienia bez ich nazwy: zaufanie, negocjacje, wypalenie, przywództwo.",
    contentKind: "prompt",
  },

  // Opowiadanie — ekstremalne
  {
    id: "91",
    title: "Historia w 10 sekund",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 55,
    description: "Maksymalna kompresja narracyjna.",
    instructions:
      "Opowiedz pełną historię z haczykiem, konfliktem i puentą w dokładnie 10 sekund. Powtórz z trzema różnymi historiami.",
    content: "Trzy historie z twojego życia, każda w 10 sekund.",
    contentKind: "prompt",
  },
  {
    id: "92",
    title: "Improwizacja bez przygotowania",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 60,
    description: "Zero sekund na myślenie.",
    instructions:
      "Naciśnij nagrywanie i zacznij mówić w tej samej sekundzie. 2 minuty spójnej narracji bez pauzy dłuższej niż 2 sekundy.",
    content: "Opowiedz historię, która zaczyna się od zdania: 'Nigdy nie planowałem, że tak to się skończy'.",
    contentKind: "prompt",
  },
  {
    id: "93",
    title: "Trzy perspektywy jednej sceny",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 55,
    description: "Ta sama scena, trzy różne prawdy.",
    instructions:
      "Opowiedz to samo wydarzenie trzy razy po 40 sekund: z twojej perspektywy, z perspektywy drugiej osoby i jako neutralny obserwator.",
    content: "Wybierz konflikt, w którym brałeś udział, i opowiedz go z trzech stron.",
    contentKind: "prompt",
  },
  {
    id: "94",
    title: "Pięcioaktowa struktura w 3 minuty",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 60,
    description: "Ekspozycja, zawiązanie, kulminacja, odwrócenie, katharsis.",
    instructions:
      "Zbuduj historię z pięcioma wyraźnymi aktami, każdy po ok. 36 sekund. Każde przejście musi być słyszalne w tempie i energii.",
    content: "Opowiedz historię największej zmiany, jaka zaszła w twoim życiu w ostatnich pięciu latach.",
    contentKind: "prompt",
  },
  {
    id: "95",
    title: "Historia z narzuconymi słowami",
    category: "Opowiadanie",
    difficulty: 5,
    xp: 60,
    description: "Improwizacja z ograniczeniami.",
    instructions:
      "Opowiedz 2-minutową, sensowną historię, w której użyjesz wszystkich pięciu słów w podanej kolejności. Bez przygotowania.",
    content: "Opowiedz historię używając poniższych słów dokładnie w tej kolejności.",
    contentKind: "words",
    wordList: ["latarnia", "rachunek", "obietnica", "przeciąg", "wtorek"],
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
