import { UserRound } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const SPEAKERS = [
  { name: "Steve Jobs", trait: "Mistrz pauzy" },
  { name: "Barack Obama", trait: "Architekt powagi" },
  { name: "MLK Jr.", trait: "Król kadencji" },
  { name: "Tony Robbins", trait: "Energia wysokiego napięcia" },
  { name: "Simon Sinek", trait: "Jasność przekonania" },
  { name: "David Goggins", trait: "Surowa intensywność" },
];

const SpeakersGrid = () => {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container">
        <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Biblioteka</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tighter sm:text-5xl">
            Trenuj z <span className="text-gradient-gold">Najlepszymi</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Każde nagranie jest porównywane z charakterystycznymi cechami legendarnych mówców.
            Wybierz swój wzór. Naucz się ich rzemiosła.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SPEAKERS.map((s, i) => (
            <div
              key={s.name}
              className={`card-gold-hover group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 ${
                inView ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <UserRound className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">{s.name}</h3>
                  <span className="mt-2 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                    {s.trait}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpeakersGrid;
