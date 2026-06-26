import { Link } from "react-router-dom";
import { Trophy, ArrowLeft, Sparkles, Calendar, Award } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { usePersonalRecords } from "@/hooks/queries";
import { cn } from "@/lib/utils";

export default function Records() {
  const { data: records = [] } = usePersonalRecords();

  // Split records into spotlight (best overall score) and rest
  const spotlight = records.find(r => r.record_type === "best_overall_score") || records[0];
  const rest = records.filter(r => r.id !== spotlight?.id);

  const milestones = [
    { id: "m1", label: "Pierwsza sesja 90+", target: 90, current: Number(spotlight?.value) || 0, unit: "pkt", achievedAt: Number(spotlight?.value) >= 90 ? spotlight.achieved_at : null },
    { id: "m2", label: "10 sesji z rzędu", target: 10, current: 0, unit: "dni", achievedAt: null },
    { id: "m3", label: "100 minut mówienia", target: 100, current: 0, unit: "min", achievedAt: null },
    { id: "m4", label: "Mistrz wypełniaczy (<5%)", target: 5, current: 100, unit: "%", achievedAt: null },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-10">
        {/* Header */}
        <header className="space-y-4">
          <Link
            to="/progress"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Powrót do postępów
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Galeria sław</span>
            </div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tight">
              Twoje <span className="text-gradient-gold">rekordy</span>
            </h1>
            <p className="text-muted-foreground text-sm">Osobiste rekordy, kamienie milowe i momenty, gdy przerosłeś samego siebie.</p>
          </div>
        </header>

        {/* Spotlight */}
        {spotlight ? (
          <section
            className="relative rounded-2xl p-8 lg:p-12 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--surface)) 0%, hsl(var(--background)) 100%)",
              boxShadow:
                "0 0 0 1px hsl(var(--accent) / 0.4), 0 30px 80px -20px hsl(var(--accent) / 0.35)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-br from-transparent via-transparent to-accent/15" />
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-gold opacity-20 blur-3xl" />
            <div className="relative space-y-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">{spotlight.label}</p>
              <p className="font-mono text-7xl lg:text-9xl text-gradient-gold leading-none">{spotlight.value}</p>
              <p className="font-mono text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {new Date(spotlight.achieved_at).toLocaleDateString("pl-PL", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              {spotlight.context && (
                <p className="text-sm text-foreground/80 max-w-md mx-auto italic pt-2">"{spotlight.context}"</p>
              )}
              {spotlight.recording_id && (
                <Link
                  to={`/results/${spotlight.recording_id}`}
                  className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
                >
                  Posłuchaj ponownie <Sparkles className="h-3 w-3" />
                </Link>
              )}
            </div>
          </section>
        ) : (
          <section className="card-premium p-12 text-center">
            <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
            <p className="font-display text-xl mb-2">Twoje rekordy pojawią się tutaj</p>
            <p className="text-sm text-muted-foreground">Nagraj kilka sesji, aby zobaczyć swoje osiągnięcia</p>
          </section>
        )}

        {/* Records grid */}
        {rest.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Wszystkie rekordy</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {rest.map((r) => {
                const inner = (
                  <div
                    className={cn(
                      "card-premium p-4 h-full tap-press relative overflow-hidden group",
                    )}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-transparent to-accent/5 transition-opacity pointer-events-none" />
                    <div className="relative space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono leading-tight">
                        {r.label}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <p className="font-mono text-3xl text-gradient-gold leading-none">{r.value}</p>
                        {r.unit && <span className="font-mono text-[10px] text-muted-foreground">{r.unit}</span>}
                      </div>
                      {r.context && <p className="text-[10px] font-mono text-accent">{r.context}</p>}
                      <p className="text-[10px] text-muted-foreground font-mono pt-1">
                        {new Date(r.achieved_at).toLocaleDateString("pl-PL", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
                return r.recording_id ? (
                  <Link key={r.id} to={`/results/${r.recording_id}`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={r.id}>{inner}</div>
                );
              })}
            </div>
          </section>
        )}

        {/* Milestones */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" /> Kamienie milowe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {milestones.map((m) => {
              const reached = !!m.achievedAt;
              const pct = reached ? 100 : Math.min(100, Math.round(((Number(m.current) || 0) / (Number(m.target) || 1)) * 100));
              return (
                <div key={m.id} className="card-premium p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">
                        {reached
                          ? `Osiągnięto ${new Date(m.achievedAt!).toLocaleDateString("pl-PL", { month: "short", day: "numeric", year: "numeric" })}`
                          : `${m.current} / ${m.target} ${m.unit ?? ""}`}
                      </p>
                    </div>
                    {reached && (
                      <span className="h-6 w-6 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                        <Trophy className="h-3 w-3 text-accent-foreground" />
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: reached ? "var(--gradient-gold)" : "var(--gradient-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
