import { UserRound, Quote } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const QUOTES = [
  {
    quote:
      "Zamknąłem pitch Series A w dwóch spotkaniach. Sam coaching pauz był wart rok praktyki.",
    name: "Marcus Chen",
    role: "Założyciel, Stratus AI",
  },
  {
    quote:
      "Przeszedłem od przerażenia prezentacjami do prowadzenia naszych cotygodniowych spotkań. Mierzalny postęp uzależnia.",
    name: "Priya Okafor",
    role: "Student MBA, Wharton",
  },
  {
    quote:
      "Mój wskaźnik zamknięć wzrósł o 34% w sześć tygodni. Ćwiczenia w trybie Gogginsa sprawiły, że każdy inny coach wydawał się miękki.",
    name: "Diego Marquez",
    role: "VP Sprzedaży, Northwind",
  },
];

const Testimonials = () => {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
        <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Wyniki</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tighter sm:text-5xl">
            Stworzone dla praktyków
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {QUOTES.map((q, i) => (
            <div
              key={q.name}
              className={`card-premium p-8 ${inView ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <Quote className="h-7 w-7 text-primary" />
              <p className="mt-4 text-lg leading-relaxed text-foreground">"{q.quote}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
                  <UserRound className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold">{q.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{q.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
