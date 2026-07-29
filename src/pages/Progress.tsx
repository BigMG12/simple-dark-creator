import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Trophy,
  Calendar,
  Check,
  Plus,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { SkillRadar } from "@/components/progress/SkillRadar";
import { Sparkline } from "@/components/progress/Sparkline";
import { ActivityHeatmap } from "@/components/progress/ActivityHeatmap";
import { BeforeAfterComparator } from "@/components/progress/BeforeAfterComparator";
import { GoalCreationModal } from "@/components/progress/GoalCreationModal";
import { GoalDetailModal } from "@/components/progress/GoalDetailModal";
import { GoalAchievedCelebration } from "@/components/progress/GoalAchievedCelebration";
import { useProgressData } from "@/hooks/queries/useProgressData";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, type UserGoal } from "@/hooks/queries/useGoals";
import { computeGoalProgress, type RangeId } from "@/lib/progressDomain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "7d", label: "7 dni" },
  { id: "30d", label: "30 dni" },
  { id: "3m", label: "3 miesiące" },
  { id: "all", label: "Cały czas" },
];

const RANGE_PREVIOUS_LABEL: Record<RangeId, string> = {
  "7d": "poprzednie 7 dni",
  "30d": "poprzednie 30 dni",
  "3m": "poprzednie 3 miesiące",
  all: "pierwsza połowa",
};

const METRIC_META: Record<string, { label: string; unit: string; invert?: boolean }> = {
  overall_score: { label: "Wynik ogólny", unit: "" },
  wpm: { label: "WPM", unit: "" },
  clarity: { label: "Klarowność", unit: "" },
  energy: { label: "Energia", unit: "" },
  pause: { label: "Pauzy", unit: "" },
  vocab: { label: "Słownictwo", unit: "" },
  filler: { label: "Wypełniacze", unit: "%", invert: true },
  talk_time_ratio: { label: "Udział mówienia", unit: "%" },
};

const GOAL_METRIC_LABEL: Record<string, string> = {
  overall_score: "Wynik ogólny",
  sessions: "Liczba sesji",
  total_minutes: "Minuty praktyki",
  streak: "Seria dni",
  wpm: "WPM",
  clarity: "Klarowność",
  filler: "Wypełniacze",
  talk_time_ratio: "Udział mówienia",
};

export default function Progress() {
  const [range, setRange] = useState<RangeId>("30d");
  const [showAchieved, setShowAchieved] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
  const [celebrationGoal, setCelebrationGoal] = useState<string | null>(null);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(() => new Set());

  const { data: progress, isLoading } = useProgressData(range);
  const { data: goals = [] } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "completed");

  // Compute progress per active goal (client-side, from real sessions)
  const goalSnapshots = useMemo(() => {
    if (!progress) return new Map<string, ReturnType<typeof computeGoalProgress>>();
    const m = new Map<string, ReturnType<typeof computeGoalProgress>>();
    for (const g of activeGoals) {
      m.set(
        g.id,
        computeGoalProgress(g.metric_key, g.target_value, g.start_value ?? 0, g.deadline, progress.points),
      );
    }
    return m;
  }, [progress, activeGoals]);

  // Auto-mark completed goals + fire celebration
  useEffect(() => {
    if (!progress) return;
    for (const g of activeGoals) {
      const snap = goalSnapshots.get(g.id);
      if (snap?.isAchieved && !celebratedIds.has(g.id)) {
        setCelebratedIds((prev) => new Set(prev).add(g.id));
        updateGoal.mutate({
          id: g.id,
          updates: { status: "completed", completed_at: new Date().toISOString() },
        });
        setCelebrationGoal(g.title);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalSnapshots, activeGoals, progress]);

  const activeGoalMetrics = useMemo(() => new Set(activeGoals.map((g) => g.metric_key)), [activeGoals]);

  const handleCreateGoal = async (draft: {
    title: string;
    metricKey?: string;
    targetValue: number;
    deadline: string;
  }) => {
    if (!draft.metricKey) {
      toast.error("Wybierz metrykę");
      return;
    }
    try {
      await createGoal.mutateAsync({
        title: draft.title,
        metric_key: draft.metricKey,
        target_value: draft.targetValue,
        start_value: readCurrentForMetric(draft.metricKey),
        deadline: draft.deadline,
      });
      toast.success("Cel utworzony");
    } catch (err: any) {
      toast.error("Nie udało się zapisać celu", { description: err?.message });
    }
  };

  const readCurrentForMetric = (metricKey: string): number => {
    if (!progress) return 0;
    const snap = computeGoalProgress(metricKey, 1, 0, new Date().toISOString(), progress.points);
    return snap.currentValue;
  };

  const empty = !progress || progress.points.length === 0;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-10">
        {/* Header */}
        <header className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-4xl lg:text-5xl tracking-tight">
                Twoja <span className="text-gradient-primary">Ewolucja</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {isLoading ? "Ładowanie danych..." : "Trendy, rekordy i wzrost liczone z Twoich sesji."}
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass">
              <Flame className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm">
                <span className="text-foreground">{progress?.streak.current ?? 0}</span>
                <span className="text-muted-foreground"> dni serii</span>
                {progress && progress.streak.longest > progress.streak.current && (
                  <span className="text-muted-foreground/70"> · rekord {progress.streak.longest}</span>
                )}
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface border border-border">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all",
                  range === r.id
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {empty && !isLoading && (
          <div className="card-premium p-10 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-accent mx-auto" />
            <h2 className="font-display text-2xl">Brak danych do pokazania</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Zrób pierwsze nagranie albo prześlij rozmowę, żeby zobaczyć swój profil, trendy, rekordy i cele.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild variant="fire">
                <Link to="/record">Nagraj wystąpienie</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/conversations/new">Prześlij rozmowę</Link>
              </Button>
            </div>
          </div>
        )}

        {!empty && progress && (
          <>
            {/* Skill Radar */}
            <section className="card-premium p-6 lg:p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-2xl">Twój profil umiejętności</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Teraz vs {RANGE_PREVIOUS_LABEL[range]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-3xl text-gradient-primary">{progress.aggregates.avgScore}</p>
                  <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Śr. wynik</p>
                </div>
              </div>
              <SkillRadar current={progress.radar.current} previous={progress.radar.previous} />
              <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
                <MiniStat label="Sesji" value={progress.aggregates.sessions.toString()} />
                <MiniStat label="Minut praktyki" value={progress.aggregates.totalMinutes.toString()} />
                <MiniStat label="Śr. wynik" value={progress.aggregates.avgScore.toString()} />
              </div>
            </section>

            {/* Trend Grid */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl">Trendy</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {progress.deltas.map((d) => {
                  const meta = METRIC_META[d.key] ?? { label: d.key, unit: "" };
                  const Arrow = d.isPositive ? TrendingUp : TrendingDown;
                  const showDelta = d.previous != null && d.deltaPct !== 0;
                  const sparkData = progress.sparklines[d.key] ?? [];
                  return (
                    <div key={d.key} className="card-premium p-4 tap-press">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                          {meta.label}
                        </span>
                        {activeGoalMetrics.has(d.key) && <Target className="h-3.5 w-3.5 text-accent" />}
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="font-mono text-3xl text-foreground">
                          {d.key === "filler"
                            ? Math.round(d.current * 1000) / 10
                            : Math.round(d.current)}
                        </span>
                        {meta.unit && <span className="text-xs text-muted-foreground font-mono">{meta.unit}</span>}
                      </div>
                      <div className="flex items-center gap-1 mb-3 min-h-[16px]">
                        {showDelta ? (
                          <>
                            <Arrow
                              className={cn("h-3 w-3", d.isPositive ? "text-success" : "text-destructive")}
                            />
                            <span
                              className={cn(
                                "text-xs font-mono",
                                d.isPositive ? "text-success" : "text-destructive",
                              )}
                            >
                              {d.deltaPct > 0 ? "+" : ""}
                              {d.deltaPct}%
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground/60">brak porównania</span>
                        )}
                      </div>
                      {sparkData.length >= 2 ? (
                        <Sparkline data={sparkData} />
                      ) : (
                        <div className="h-9" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Heatmap */}
            <section className="card-premium p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl">Aktywność</h2>
                <span className="text-xs font-mono text-muted-foreground">Ostatnie 90 dni</span>
              </div>
              <ActivityHeatmap days={progress.heatmap} />
            </section>

            {/* Personal Records */}
            {progress.records.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" /> Rekordy osobiste
                  </h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {progress.records.slice(0, 4).map((r) => {
                    const inner = (
                      <div className="card-premium p-4 h-full tap-press">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
                          {r.label}
                        </p>
                        <p className="font-mono text-2xl text-gradient-gold mb-2">{r.value}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {new Date(r.achieved_at).toLocaleDateString("pl-PL", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    );
                    if (r.sessionId && r.source === "solo") {
                      return (
                        <Link key={r.id} to={`/results/${r.sessionId}`}>
                          {inner}
                        </Link>
                      );
                    }
                    if (r.sessionId && r.source === "conversation") {
                      return (
                        <Link key={r.id} to={`/conversations/${r.sessionId}`}>
                          {inner}
                        </Link>
                      );
                    }
                    return <div key={r.id}>{inner}</div>;
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Goals — always visible (has its own empty state) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Aktywne cele</h2>
            <Button variant="ghost-dark" size="sm" onClick={() => setGoalModalOpen(true)}>
              <Plus className="h-4 w-4" /> Ustaw nowy cel
            </Button>
          </div>

          {activeGoals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze żadnych aktywnych celów. Dodaj pierwszy, żeby AI śledziło Twój postęp.
            </p>
          )}

          <div className="space-y-3">
            {activeGoals.map((g) => {
              const snap = goalSnapshots.get(g.id);
              const progressPercent = snap?.progressPercent ?? 0;
              const nearComplete = progressPercent >= 75;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGoal(g)}
                  className="card-premium p-4 space-y-3 tap-press cursor-pointer w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{g.title}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {GOAL_METRIC_LABEL[g.metric_key] ?? g.metric_key} · termin{" "}
                        {new Date(g.deadline).toLocaleDateString("pl-PL", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm shrink-0",
                        nearComplete ? "text-accent" : "text-muted-foreground",
                      )}
                    >
                      {snap?.currentValue ?? 0} / {g.target_value}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent}%`,
                        background: nearComplete ? "var(--gradient-gold)" : "var(--gradient-primary)",
                        boxShadow: nearComplete ? "0 0 12px hsl(var(--accent) / 0.5)" : undefined,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {achievedGoals.length > 0 && (
            <>
              <button
                onClick={() => setShowAchieved((p) => !p)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAchieved && "rotate-180")} />
                Osiągnięte cele ({achievedGoals.length})
              </button>
              {showAchieved && (
                <div className="space-y-2 pl-2">
                  {achievedGoals.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border"
                    >
                      <span className="h-6 w-6 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 text-accent-foreground" />
                      </span>
                      <span className="text-sm flex-1">{g.title}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {g.completed_at &&
                          new Date(g.completed_at).toLocaleDateString("pl-PL", {
                            month: "short",
                            day: "numeric",
                          })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Before / After */}
        {progress && progress.points.length >= 2 && (
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Zobacz swój rozwój</h2>
            <BeforeAfterComparator
              recordings={progress.points.map((p) => ({
                id: p.id,
                date: p.created_at,
                topic: p.source === "conversation" ? "Rozmowa" : "Nagranie",
                score: Math.round(p.overall_score),
                metrics: {
                  wpm: Math.round(p.metrics.wpm ?? 0),
                  clarity: Math.round(p.metrics.clarity ?? 0),
                  energy: Math.round(p.metrics.energy ?? 0),
                  pause: Math.round(p.metrics.pause ?? 0),
                  vocab: Math.round(p.metrics.vocab ?? 0),
                  filler: Math.round((p.metrics.filler ?? 0) * 100),
                },
              }))}
              initialBefore={{
                id: progress.points[progress.points.length - 1].id,
                date: progress.points[progress.points.length - 1].created_at,
                score: Math.round(progress.points[progress.points.length - 1].overall_score),
                metrics: { wpm: 0, clarity: 0, energy: 0, pause: 0, vocab: 0, filler: 0 },
              }}
              initialAfter={{
                id: progress.points[0].id,
                date: progress.points[0].created_at,
                score: Math.round(progress.points[0].overall_score),
                metrics: { wpm: 0, clarity: 0, energy: 0, pause: 0, vocab: 0, filler: 0 },
              }}
            />
          </section>
        )}
      </div>

      <GoalCreationModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onCreate={handleCreateGoal}
      />
      <GoalDetailModal
        goal={
          selectedGoal
            ? {
                id: selectedGoal.id,
                title: selectedGoal.title,
                targetMetric: selectedGoal.metric_key,
                targetValue: selectedGoal.target_value,
                currentValue: goalSnapshots.get(selectedGoal.id)?.currentValue ?? 0,
                deadline: selectedGoal.deadline,
                progressPercent: goalSnapshots.get(selectedGoal.id)?.progressPercent ?? 0,
              }
            : null
        }
        open={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        onDelete={async () => {
          if (!selectedGoal) return;
          try {
            await deleteGoal.mutateAsync(selectedGoal.id);
            toast.success("Cel usunięty");
            setSelectedGoal(null);
          } catch (err: any) {
            toast.error("Nie udało się usunąć celu", { description: err?.message });
          }
        }}
      />
      <GoalAchievedCelebration
        goalTitle={celebrationGoal}
        open={!!celebrationGoal}
        onClose={() => setCelebrationGoal(null)}
      />
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-2xl text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-1">{label}</p>
    </div>
  );
}
