import { Gauge, Pause, Filter, Activity, Mic2, BookOpen } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { useCountUp } from "@/hooks/use-count-up";

const METRICS = [
  { icon: Gauge, label: "SŁÓW_NA_MINUTĘ", desc: "Znajdź swój idealny rytm.", target: 142, suffix: "" },
  { icon: Pause, label: "MISTRZOSTWO_PAUZ", desc: "Cisza to broń. Władaj nią.", target: 87, suffix: "%" },
  { icon: Filter, label: "GĘSTOŚĆ_WYPEŁNIACZY", desc: "Wyeliminuj eee iyyy.", target: 12, suffix: "" },
  { icon: Activity, label: "WARIANCJA_ENERGII", desc: "Dynamiczny zakres, który fascynuje.", target: 76, suffix: "%" },
  { icon: Mic2, label: "KLAROWNOŚĆ_GŁOSU", desc: "Wyraźna artykulacja, każde słowo.", target: 94, suffix: "%" },
  { icon: BookOpen, label: "GŁĘBIA_SŁOWNICTWA", desc: "Zakres ekspresji.", target: 68, suffix: "%" },
];

const MetricTile = ({ m, delay, start }: { m: (typeof METRICS)[number]; delay: number; start: boolean }) => {
  const value = useCountUp(m.target, 1600, start);
  return (
    <div
      className={`card-premium p-6 ${start ? "animate-fade-in-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <m.icon className="h-5 w-5 text-primary" />
        <span className="font-mono text-3xl font-medium tabular-nums text-foreground">
          {value}
          <span className="text-primary">{m.suffix}</span>
        </span>
      </div>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {m.label}
      </p>
      <p className="mt-2 text-sm text-foreground/80">{m.desc}</p>
    </div>
  );
};

const MetricsGrid = () => {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
        <div ref={ref} className={inView ? "animate-fade-in-up" : "opacity-0"}>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Dane</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tighter sm:text-5xl">
            Co mierzymy
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Sześć wymiarów elitarnej mowy. Śledzone w każdej sesji. Ulepszane co tydzień.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m, i) => (
            <MetricTile key={m.label} m={m} delay={i * 80} start={inView} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsGrid;
