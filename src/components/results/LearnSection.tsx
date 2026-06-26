import { GraduationCap, BookOpen, Play, ArrowRight } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface LearnArticle {
  title: string
  kind: "article" | "technique" | "video"
  durationLabel: string
  excerpt: string
  body: string[]
}

interface Props {
  weakestDimension?: string | null
  accentColor: string
}

const LIBRARY: Record<string, LearnArticle[]> = {
  fillers: [
    {
      title: "Czym są filler words i dlaczego zabijają autorytet",
      kind: "article",
      durationLabel: "5 min czytania",
      excerpt:
        "Słowa-zapełniacze (yyy, no, w sumie, jakby) sygnalizują, że mózg dogania język. Tłum to słyszy.",
      body: [
        "Filler words to dźwięki bez znaczenia, którymi wypełniamy ciszę, gdy myśl jeszcze się nie sformułowała.",
        "Najczęstsze w polskim: 'yyy', 'no', 'w sumie', 'jakby', 'tak naprawdę', 'znaczy'.",
        "Trening: nagrywaj 60-sekundowe odpowiedzi, transkrybuj, podkreśl każdy filler. Powtarzaj aż spadnie poniżej 2 na minutę.",
      ],
    },
    {
      title: "Technika: 'pauza zamiast yyy'",
      kind: "technique",
      durationLabel: "3 min",
      excerpt:
        "Każdy filler zastąp ciszą 0.8 s. Brzmi przerażająco. Słuchaczom brzmi pewnie.",
      body: [
        "Reguła: kiedy czujesz, że zaraz powiesz 'yyy' — zamknij usta i policz w głowie do dwóch.",
        "Cisza poniżej 1 s nie czyta się jako luka, czyta się jako kontrola.",
      ],
    },
  ],
  pause_mastery: [
    {
      title: "Architektura pauzy: kiedy, jak długo, po co",
      kind: "article",
      durationLabel: "6 min czytania",
      excerpt:
        "Pauza po pointe podkreśla. Pauza przed pointe buduje napięcie. Pauza w środku zdania zabija sens.",
      body: [
        "Trzy typy pauz: oddechowa (0.4-0.7 s), retoryczna (0.8-1.5 s), dramatyczna (1.5-3 s).",
        "Złota zasada: pauza JEST komunikatem. Mówi 'to było ważne' albo 'teraz będzie ważne'.",
      ],
    },
  ],
  energy_variance: [
    {
      title: "Jak budować wariancję energii",
      kind: "technique",
      durationLabel: "4 min",
      excerpt:
        "Monotonia nie jest problemem głośności — jest problemem kontrastu. Zmieniaj tempo, nie tylko ton.",
      body: [
        "Ćwiczenie: weź jedno zdanie i wypowiedz je 5 razy — bardzo wolno, bardzo szybko, szeptem, krzykiem, neutralnie.",
        "W realnej wypowiedzi mieszaj te tryby co 2-3 zdania. To utrzymuje uwagę.",
      ],
    },
  ],
  pace_wpm: [
    {
      title: "Tempo: za szybko vs za wolno",
      kind: "article",
      durationLabel: "5 min czytania",
      excerpt:
        "Optimum dla prezentacji: 130–160 słów/min. Poniżej — nudzisz. Powyżej — nie nadążają.",
      body: [
        "Za szybko = niepewność. Mózg słuchacza nie zdąża przetworzyć argumentu.",
        "Za wolno = brak energii. Słuchacz traci wątek między słowami.",
        "Trening: czytaj na głos artykuł i mierz WPM stoperem. Cel: 140 ±10.",
      ],
    },
  ],
  clarity: [
    {
      title: "Klarowność: jedna myśl = jedno zdanie",
      kind: "article",
      durationLabel: "4 min czytania",
      excerpt:
        "Im dłuższe zdanie, tym mniejsza szansa, że tłum dotrze do końca z Tobą.",
      body: [
        "Reguła: jeśli zdanie ma więcej niż 20 słów, podziel je.",
        "Strukturyzuj wypowiedź wg PREP: Point → Reason → Example → Point.",
      ],
    },
  ],
  vocabulary: [
    {
      title: "Głębia słownictwa bez 'mądrych' słów",
      kind: "article",
      durationLabel: "5 min czytania",
      excerpt:
        "Bogate słownictwo to nie żargon. To precyzyjne czasowniki i konkretne rzeczowniki.",
      body: [
        "Wymień 'robić' na: budować, uruchamiać, projektować, doszlifowywać.",
        "Wymień 'rzecz' na konkretny obiekt. 'System' zamiast 'rzecz'. 'Nawyk' zamiast 'coś'.",
      ],
    },
  ],
}

const GENERAL: LearnArticle[] = [
  {
    title: "Anatomia mocnego otwarcia",
    kind: "article",
    durationLabel: "5 min czytania",
    excerpt: "Pierwsze 10 sekund decyduje czy Cię słuchają, czy odjeżdżają w telefon.",
    body: [
      "Trzy szablony otwarć: pytanie z dysonansem, statystyka która szokuje, anegdota osobista.",
      "Nigdy nie zaczynaj od 'cześć, dzisiaj opowiem o...'. To zaproszenie do spania.",
    ],
  },
]

function pickArticles(weakest?: string | null): LearnArticle[] {
  const arr = weakest && LIBRARY[weakest] ? LIBRARY[weakest] : []
  return [...arr, ...GENERAL].slice(0, 4)
}

export function LearnSection({ weakestDimension, accentColor }: Props) {
  const articles = pickArticles(weakestDimension)

  return (
    <section className="card-premium p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}22`, color: accentColor }}
        >
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Sekcja 6 · Nauka
          </div>
          <h2 className="font-display text-2xl">Pogłęb temat</h2>
        </div>
      </div>
      {weakestDimension && (
        <p className="text-sm text-muted-foreground mb-4">
          Materiały dobrane do Twojego najsłabszego wymiaru:{" "}
          <span style={{ color: accentColor }}>{weakestDimension}</span>
        </p>
      )}

      <Accordion type="single" collapsible className="w-full">
        {articles.map((art, i) => {
          const Icon = art.kind === "video" ? Play : art.kind === "technique" ? ArrowRight : BookOpen
          return (
            <AccordionItem value={`item-${i}`} key={i}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-start gap-3 text-left">
                  <Icon
                    className="h-4 w-4 mt-1 flex-shrink-0"
                    style={{ color: accentColor }}
                  />
                  <div>
                    <div className="font-medium">{art.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {art.durationLabel}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-7 space-y-2 text-foreground/85">
                  <p className="italic text-muted-foreground">{art.excerpt}</p>
                  {art.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}
