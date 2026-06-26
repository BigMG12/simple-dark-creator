import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy,
  Calendar,
  Check,
  Plus,
  ChevronDown,
  X,
  Share2,
  AlertTriangle,
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
import {
  useGoals,
  usePersonalRecords,
  useActivityHeatmap,
  useSkillMetrics,
  useDashboardStats,
  useRecentRecordings,
} from "@/hooks/queries";
import { cn } from "@/lib/utils";

type GoalDraft = {
  title: string;
  metricKey?: string;
  targetValue: number;
  deadline: string;
};

type Goal = {
  id: string;
  title: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  progressPercent: number;
};

const RANGES = [
  { id: "7d", label: "7 dni" },
  { id: "30d", label: "30 dni" },
  { id: "3m", label: "3 miesiące" },
  { id: "all", label: "Cały czas" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const RANGE_PREVIOUS_LABEL: Record<RangeId, string> = {
  "7d": "poprzednie 7 dni",
  "30d": "poprzednie 30 dni",
  "3m": "poprzednie 3 miesiące",
  all: "pierwsza połowa",
};

export default function Progress() {
  // Fetch data from Supabase
  const { data: stats } = useDashboardStats();
  const { data: goals = [] } = useGoals();
  const { data: records = [] } = usePersonalRecords();
  const { data: heatmapData = [] } = useActivityHeatmap();
  const { data: skillMetrics } = useSkillMetrics();
  const { data: recentRecordings = [] } = useRecentRecordings(10);

  const [range, setRange] = useState<RangeId>("30d");
  const [showAchieved, setShowAchieved] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [celebrationGoal, setCelebrationGoal] = useState<string | null>(null);

  // Split goals into active and achieved
  const activeGoals = goals.filter(g => g.status === 'active');
  const achievedGoals = goals.filter(g => g.status === 'completed');

  // Mock alerts for now (TODO: add stagnation detection)
  const alerts: any[] = [];

  // Mock metrics for trend grid (TODO: calculate from analyses)
  const metricEntries = useMemo(() => {
    if (!skillMetrics) return [];
    return Object.entries({
      wpm: { label: "WPM", current: skillMetrics.wpm || 0, delta: 0, unit: "", sparkline: [], invert: false },
      clarity: { label: "Klarowność", current: skillMetrics.clarity || 0, delta: 0, unit: "%", sparkline: [], invert: false },
      energy: { label: "Energia", current: skillMetrics.energy || 0, delta: 0, unit: "%", sparkline: [], invert: false },
      filler: { label: "Kontrola wypełniaczy", current: skillMetrics.filler || 0, delta: 0, unit: "%", sparkline: [], invert: true },
    });
  }, [skillMetrics]);

  const goalIds = useMemo(() => new Set(activeGoals.map((g) => g.target_metric)), [activeGoals]);

  const handleCreateGoal = (draft: GoalDraft) => {
    // TODO: implement goal creation mutation
    console.log("Create goal:", draft);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-10">
        {/* 1. Header */}
        <header className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-4xl lg:text-5xl tracking-tight">
                Twoja <span className="text-gradient-primary">Ewolucja</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">Trendy, rekordy i wzrost oceniany przez AI.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass">
              <Flame className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm">
                <span className="text-foreground">{stats?.current_streak || 0}</span>
                <span className="text-muted-foreground"> dni serii</span>
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
                  range === r.id ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {/* Stagnation alerts */}
        {alerts.map((a) => (
          <div
            key={a.metric}
            className="flex items-start gap-3 p-4 rounded-lg border border-destructive/40 bg-destructive/10"
          >
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                Twój <span className="font-semibold">{a.metricLabel}</span> nie zmienił się od {a.daysStagnant} dni. Spróbuj ćwiczenia {a.suggestedDrillTitle}?
              </p>
              <Button asChild size="sm" variant="fire" className="mt-3">
                <Link to={`/drills/${a.suggestedDrillId}`}>Wykonaj ćwiczenie</Link>
              </Button>
            </div>
            <button
              onClick={() => setDismissedAlerts((p) => [...p, a.metric])}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* 2. Skill Radar */}
        {skillMetrics && (
          <section className="card-premium p-6 lg:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl">Twój profil umiejętności</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Teraz vs {RANGE_PREVIOUS_LABEL[range]}
                </p>
              </div>
            </div>
            <SkillRadar
              current={{
                wpm: skillMetrics.wpm || 0,
                clarity: skillMetrics.clarity || 0,
                energy: skillMetrics.energy || 0,
                pause: skillMetrics.pause || 0,
                vocab: skillMetrics.vocab || 0,
                filler: skillMetrics.filler || 0,
              }}
              previous={{
                wpm: 0,
                clarity: 0,
                energy: 0,
                pause: 0,
                vocab: 0,
                filler: 0,
              }}
            />
          </section>
        )}

        {/* 3. Trend Grid */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Trendy</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {metricEntries.map(([key, m]) => {
              const isPositive = m.invert ? m.delta < 0 : m.delta > 0;
              const Arrow = isPositive ? TrendingUp : TrendingDown;
              return (
                <a
                  key={key}
                  href={`#metric-${key}`}
                  className="card-premium p-4 tap-press block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{m.label}</span>
                    {goalIds.has(key) && <Target className="h-3.5 w-3.5 text-accent" />}
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="font-mono text-3xl text-foreground">{m.current}</span>
                    {m.unit && <span className="text-xs text-muted-foreground font-mono">{m.unit}</span>}
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    <Arrow className={cn("h-3 w-3", isPositive ? "text-success" : "text-destructive")} />
                    <span className={cn("text-xs font-mono", isPositive ? "text-success" : "text-destructive")}>
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}%
                    </span>
                  </div>
                  <Sparkline data={m.sparkline} />
                </a>
              );
            })}
          </div>
        </section>

        {/* 4. AI Weekly Review - TODO: implement weekly reviews */}

        {/* 5. Heatmap */}
        <section className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Aktywność</h2>
            <span className="text-xs font-mono text-muted-foreground">Ostatnie 90 dni</span>
          </div>
          <ActivityHeatmap days={heatmapData} />
        </section>

        {/* 6. Personal Records */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" /> Rekordy osobiste
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/records">Galeria sław →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {records.slice(0, 4).map((r) => {
              const inner = (
                <div className="card-premium p-4 h-full tap-press">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">{r.label}</p>
                  <p className="font-mono text-2xl text-gradient-gold mb-2">{r.value}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {new Date(r.achieved_at).toLocaleDateString("pl-PL", { month: "short", day: "numeric" })}
                  </p>
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

        {/* 7. Goals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Aktywne cele</h2>
            <Button variant="ghost-dark" size="sm" onClick={() => setGoalModalOpen(true)}>
              <Plus className="h-4 w-4" /> Ustaw nowy cel
            </Button>
          </div>
          <div className="space-y-3">
            {activeGoals.map((g) => {
              const progressPercent = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
              const nearComplete = progressPercent >= 75;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGoal({
                    id: g.id,
                    title: g.title,
                    targetMetric: g.target_metric,
                    targetValue: g.target_value,
                    currentValue: g.current_value,
                    deadline: g.deadline,
                    progressPercent,
                  })}
                  className="card-premium p-4 space-y-3 tap-press cursor-pointer w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{g.title}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Termin {new Date(g.deadline).toLocaleDateString("pl-PL", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={cn("font-mono text-sm shrink-0", nearComplete ? "text-accent" : "text-muted-foreground")}>
                      {g.current_value} / {g.target_value}
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
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
                  <span className="h-6 w-6 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-accent-foreground" />
                  </span>
                  <span className="text-sm flex-1">{g.title}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {g.completed_at && new Date(g.completed_at).toLocaleDateString("pl-PL", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 8. Before/After - TODO: implement comparator with real recordings */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Zobacz swój rozwój</h2>
          {recentRecordings.length >= 2 && (
            <BeforeAfterComparator
              recordings={recentRecordings.map((r: any) => ({
                id: r.id,
                date: r.created_at,
                topic: r.topic || "Bez tematu",
                score: r.analysis?.overall_score || 0,
                metrics: { wpm: 0, clarity: 0, energy: 0, pause: 0, vocab: 0, filler: 0 },
              }))}
              initialBefore={{ id: (recentRecordings as any)[recentRecordings.length - 1]?.id ?? '', date: '', score: 0, metrics: { wpm: 0, clarity: 0, energy: 0, pause: 0, vocab: 0, filler: 0 } }}
              initialAfter={{ id: (recentRecordings as any)[0]?.id ?? '', date: '', score: 0, metrics: { wpm: 0, clarity: 0, energy: 0, pause: 0, vocab: 0, filler: 0 } }}
            />
          )}
        </section>
      </div>

      <GoalCreationModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onCreate={handleCreateGoal}
      />
      <GoalDetailModal
        goal={selectedGoal}
        open={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
      />
      <GoalAchievedCelebration
        goalTitle={celebrationGoal}
        open={!!celebrationGoal}
        onClose={() => setCelebrationGoal(null)}
      />
    </AppShell>
  );
}
