import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Mic,
  Flame,
  ChevronRight,
  Trophy,
  Crown,
  Zap,
  Star,
  Lock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/nav/AppShell";
import { Sparkline } from "@/components/progress/Sparkline";
import { MiniSkillRadar } from "@/components/progress/MiniSkillRadar";
import { cn } from "@/lib/utils";
import { CATEGORY_BY_ID } from "@/data/categories";
import {
  useDashboardStats,
  useProgressChartData,
  useProfile,
  useBadges,
  useDailyDrill,
  useRecentRecordings,
  useSpeaker,
} from "@/hooks/queries";

const BADGE_ICONS = { flame: Flame, trophy: Trophy, zap: Zap, star: Star, mic: Mic, crown: Crown };

function streakClass(days: number) {
  if (days >= 7) return "text-accent";
  if (days >= 3) return "text-gradient-primary";
  return "text-muted-foreground";
}

function scoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-accent";
  if (score >= 55) return "text-foreground";
  return "text-destructive";
}

function relativeDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return "Dziś";
  if (diff === 1) return "Wczoraj";
  if (diff < 7) return `${diff} dni temu`;
  return d.toLocaleDateString("pl-PL", { month: "short", day: "numeric" });
}

function fmtDur(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch data from Supabase
  const { data: profile } = useProfile();
  const { data: stats } = useDashboardStats();
  const { data: badges = [] } = useBadges();
  const { data: dailyDrill } = useDailyDrill();
  const { data: recentRecordings = [] } = useRecentRecordings(5);
  const { data: chartData = [] } = useProgressChartData(14);
  const { data: mentorData } = useSpeaker(profile?.selected_speaker_id);

  // Calculate derived values
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpToNext = level * 100;
  const xpPct = Math.min(100, Math.round((xp / xpToNext) * 100));
  const streakDays = stats?.current_streak || 0;
  const totalSessions = stats?.total_sessions || 0;
  const averageScore = Math.round(stats?.average_score || 0);

  // Mentor styling
  const mentorCategory = mentorData?.category_id || "sales";
  const cat = CATEGORY_BY_ID[mentorCategory] || CATEGORY_BY_ID.sales;
  const mentorGradient = `var(--${cat.gradientVar})`;
  const mentorAccent = `hsl(var(--${cat.accentVar}))`;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-10">
        {/* Greeting */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">
              Panel główny
            </div>
            <h1 className="font-display text-3xl md:text-4xl">
              Witaj ponownie, <span className="text-gradient-primary">{profile?.full_name || "Użytkowniku"}</span>
            </h1>
          </div>
          <div className={cn("inline-flex items-center gap-2 font-mono text-sm md:text-base", streakClass(streakDays))}>
            <Flame className="h-5 w-5" />
            <span className="tabular-nums">{streakDays}</span>
            <span className="text-xs uppercase tracking-widest opacity-70">dni z rzędu</span>
          </div>
        </header>

        {/* Hero stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-premium p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Poziom</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-4xl tabular-nums">{level}</span>
              <span className="text-xs text-muted-foreground">/ ∞</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-primary shadow-glow rounded-full transition-all"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <div className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
              {xp} / {xpToNext} XP
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Sesje</div>
            <div className="font-mono text-5xl tabular-nums">{totalSessions}</div>
            <div className="mt-3 text-xs text-muted-foreground">nagranych sesji</div>
          </div>

          <div className="card-premium p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Średni wynik</div>
            <div className="flex items-baseline gap-2">
              <span className={cn("font-mono text-5xl tabular-nums", scoreColor(averageScore))}>
                {averageScore}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">ostatnie 30 dni</div>
          </div>
        </section>

        {/* Primary action */}
        <section className="card-shimmer relative overflow-hidden rounded-2xl bg-gradient-primary p-7 md:p-10 shadow-elegant">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl animate-float-blob" />
          <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-accent/20 blur-3xl animate-float-blob" style={{ animationDelay: "4s" }} />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary-foreground/80 mb-2">
                Dzisiaj
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-primary-foreground">Gotowy do treningu?</h2>
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-mono text-sm font-bold text-primary-foreground shadow-elegant"
                  style={{ background: mentorGradient }}
                >
                  {mentorData?.monogram || "JB"}
                </div>
                <div>
                  <div className="text-sm text-primary-foreground/80">
                    Twój mentor: <span className="font-semibold text-primary-foreground">{mentorData?.name || "Wybierz mentora"}</span>
                  </div>
                  {(mentorData as any)?.persona?.rhetoricalDevices && (
                    <div className="text-xs text-primary-foreground/60 mt-0.5">
                      Ocenia Cię za: {(mentorData as any).persona.rhetoricalDevices.slice(0, 3).join(", ")}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/speakers")}
                  className="ml-2 text-xs underline underline-offset-2 text-primary-foreground/80 hover:text-primary-foreground"
                >
                  Zmień
                </button>
              </div>
            </div>
            <Button
              size="xl"
              onClick={() => navigate("/record")}
              className="tap-press bg-background text-foreground hover:bg-background/90 hover:-translate-y-0.5 font-semibold shadow-elegant"
            >
              <Mic />
              Rozpocznij nową sesję
            </Button>
          </div>
        </section>

        {/* Daily drill */}
        {dailyDrill && (
          <section className="card-premium p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-5">
            <div className="h-14 w-14 rounded-xl bg-gradient-gold flex items-center justify-center shadow-elegant shrink-0">
              <Sparkles className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-1">
                Dzisiejsze ćwiczenie
              </div>
              <div className="font-display text-xl md:text-2xl">{dailyDrill.title}</div>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-surface border border-border text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {dailyDrill.category}
                </span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < dailyDrill.difficulty ? "fill-accent text-accent" : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs text-success">+{dailyDrill.xp_reward} XP</span>
              </div>
            </div>
            <Button variant="fire" onClick={() => navigate(`/drills/${dailyDrill.id}`)}>
              Rozpocznij ćwiczenie
              <ArrowRight />
            </Button>
          </section>
        )}

        {/* This Week summary strip - TODO: Add weekly stats hook */}

        {/* Mini radar + Coach whisper - TODO: Add skill metrics and daily insights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-premium p-5 flex flex-col items-center md:col-span-1">
            <div className="w-full flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Teraz
              </div>
              <Link
                to="/progress"
                className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary-glow inline-flex items-center gap-1"
              >
                Zobacz pełną ewolucję <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">Dostępne po pierwszych sesjach</div>
          </div>

          <div className="card-premium p-5 md:col-span-2 flex flex-col">
            <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-primary/10 border border-primary/30 mb-3">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Dzisiejsza wskazówka</span>
            </div>
            <p className="font-display text-lg md:text-xl leading-snug text-foreground/90 card-shimmer rounded-md py-1">
              Kontynuuj nagrywanie sesji, aby otrzymywać spersonalizowane wskazówki od AI.
            </p>
            <div className="mt-auto pt-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Wygenerowane przez AI · odświeża się codziennie</span>
              <Link to="/reviews" className="font-mono text-[10px] uppercase tracking-widest text-primary hover:text-primary-glow inline-flex items-center gap-1">
                Wszystkie recenzje <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Active goals + Personal best - TODO: Add useGoals and usePersonalRecords hooks */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-premium p-5 md:col-span-2">
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg">Aktywne cele</h3>
              </div>
              <Link
                to="/progress#goals"
                className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Zobacz wszystkie <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">Ustaw cele w sekcji Postępy</div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/record")}
            className="card-gold-hover tap-press text-left rounded-xl p-5 bg-surface border border-accent/40 flex flex-col"
            style={{ boxShadow: "0 0 0 1px hsl(var(--accent) / 0.2)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-accent">Rekord osobisty</span>
            </div>
            <p className="text-sm text-foreground/90 mb-1">{stats?.best_score ? "Najlepszy wynik" : "Brak rekordów"}</p>
            <p className="font-mono text-3xl text-gradient-gold mb-1">{stats?.best_score || "—"}</p>
            {stats?.best_score_date && (
              <p className="text-xs text-muted-foreground font-mono mb-4">
                {new Date(stats.best_score_date).toLocaleDateString("pl-PL", { month: "short", day: "numeric" })}
              </p>
            )}
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-mono text-primary">
              Spróbuj pobić ten wynik <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        </section>


        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl">Ostatnie sesje</h2>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Zobacz wszystkie <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="-mx-5 lg:mx-0 px-5 lg:px-0 overflow-x-auto">
            <div className="flex gap-4 pb-2 lg:grid lg:grid-cols-5">
              {recentRecordings.length === 0 ? (
                <div className="card-premium p-8 text-center w-full">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant mb-4">
                    <Mic className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <p className="font-display text-lg mb-1">Twoja podróż zaczyna się od jednego słowa.</p>
                  <p className="text-sm text-muted-foreground mb-5">Naciśnij Nagraj. Posłuchaj siebie. Stań się lepszy.</p>
                  <Button variant="fire" onClick={() => navigate("/record")}>
                    <Mic /> Nagraj swoją pierwszą sesję
                  </Button>
                </div>
              ) : (
                recentRecordings.map((recording) => (
                  <button
                    key={recording.id}
                    type="button"
                    onClick={() => navigate(`/results/${recording.id}`)}
                    className="tap-press card-premium p-5 text-left min-w-[230px] lg:min-w-0 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {relativeDay(recording.created_at)}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{fmtDur(recording.duration_seconds)}</span>
                    </div>
                    <div className={cn("font-mono text-4xl tabular-nums mb-3", scoreColor(recording.analysis?.overall_score || 0))}>
                      {recording.analysis?.overall_score || "—"}
                    </div>
                    <div className="text-sm text-foreground/80 line-clamp-2">{recording.topic || "Bez tematu"}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Trajectory */}
        <section className="card-premium p-6 md:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                Ostatnie 14 sesji
              </div>
              <h2 className="font-display text-2xl">Twoja trajektoria</h2>
            </div>
          </div>
          {chartData.length < 3 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
              <p className="text-sm text-foreground/80 font-display">Po trzech sesjach pojawi się twoja trajektoria.</p>
              <p className="text-xs text-muted-foreground mt-1">Kontynuuj nagrywanie — linia należy do ciebie.</p>
            </div>
          ) : (
            <div className="h-56 md:h-64 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="traj-stroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                    </linearGradient>
                    <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary) / 0.3)", strokeWidth: 1 }}
                    contentStyle={{
                      background: "hsl(var(--surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="overall_score"
                    stroke="url(#traj-stroke)"
                    strokeWidth={2.5}
                    fill="url(#traj-fill)"
                    style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Badges — collapsed link */}
        <section>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="card-premium p-4 w-full flex items-center justify-between tap-press"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-gold flex items-center justify-center shadow-elegant">
                <Trophy className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="text-left">
                <p className="font-display text-base">{badges.filter((b) => b.earned).length} zdobytych odznak</p>
                <p className="text-xs text-muted-foreground font-mono">z {badges.length} dostępnych</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickLink label="Poznaj mówców" to="/speakers" icon={Trophy} />
          <QuickLink label="Wszystkie ćwiczenia" to="/drills" icon={Flame} />
          <QuickLink label="Twój profil" to="/profile" icon={Star} />
        </section>
      </div>
    </AppShell>
  );
}

function QuickLink({ label, to, icon: Icon }: { label: string; to: string; icon: typeof Star }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="tap-press card-premium p-5 flex items-center gap-4 text-left"
    >
      <div className="h-10 w-10 rounded-lg bg-surface border border-border flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="font-display text-base flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
