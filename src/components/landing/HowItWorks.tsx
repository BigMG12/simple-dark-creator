import { Mic, AudioWaveform, Flame } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const STEPS = [
  {
    icon: Mic,
    title: "Nagraj",
    desc: "Mów przez 60 sekund. Dowolny temat. Bez presji.",
  },
  {
    icon: AudioWaveform,
    title: "Analizuj",
    desc: "Nasza AI analizuje twoje tempo, pauzy, słowa wypełniacze, ton i energię w sekundach.",
  },
  {
    icon: Flame,
    title: "Transformuj",
    desc: "Zostań dopasowany do światowej klasy mówcy i ćwicz, aż opanujesz scenę.",
  },
];

const HowItWorks = () => {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
        <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Metoda</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tighter sm:text-5xl">
            Jak to działa
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={`card-premium p-8 ${inView ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold">
                <span className="font-mono text-sm text-primary mr-2">0{i + 1}</span>
                {s.title}
              </h3>
              <p className="mt-3 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
