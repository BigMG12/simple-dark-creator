import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  Quote,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { useConversationResult } from "@/hooks/queries";
import { CONVERSATION_TYPE_META, type ConversationType } from "@/data/conversationTypes";
import { cn } from "@/lib/utils";

const TYPE_ANALYZE_MESSAGES: Record<ConversationType, string[]> = {
  sales: [
    "Rozdzielanie mówców...",
    "Izolowanie twojego głosu...",
    "Analiza obsługi obiekcji...",
    "Ocena prób zamknięcia sprzedaży...",
    "Przygotowywanie notatek coacha...",
  ],
  meeting: [
    "Rozdzielanie mówców...",
    "Mapowanie kto co powiedział...",
    "Mierzenie twojego czasu wypowiedzi...",
    "Wykrywanie przerywań...",
    "Przygotowywanie notatek coacha...",
  ],
  interviewee: [
    "Rozdzielanie mówców...",
    "Izolowanie twoich odpowiedzi...",
    "Wykrywanie struktury opowieści...",
    "Mierzenie wskaźników pewności siebie...",
    "Przygotowywanie notatek coacha...",
  ],
  interviewer: [
    "Rozdzielanie mówców...",
    "Izolowanie twoich pytań...",
    "Mierzenie głębokości pytań uzupełniających...",
    "Wykrywanie tolerancji ciszy...",
    "Przygotowywanie notatek coacha...",
  ],
  negotiation: [
    "Rozdzielanie mówców...",
    "Wykrywanie kotwic i ram...",
    "Śledzenie ustępstw...",
    "Mierzenie empatii taktycznej...",
    "Przygotowywanie notatek coacha...",
  ],
  coaching: [
    "Rozdzielanie mówców...",
    "Mapowanie twoich pytań vs stwierdzeń...",
    "Mierzenie głębokości sokratejskiej...",
    "Wykrywanie momentów przewodnictwa...",
    "Przygotowywanie notatek coacha...",
  ],
};

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function fmtTimestamp(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const EVENT_COLOR: Record<string, string> = {
  objection: "hsl(var(--destructive))",
  close: "hsl(var(--primary))",
  interruption: "hsl(var(--accent))",
  question: "hsl(var(--category-authority))",
  anchor: "hsl(var(--category-sales))",
  concession: "hsl(var(--category-influence))",
  moment: "hsl(var(--success))",
};

function ScorecardRadar({
  data,
}: {
  data: { axis: string; you: number; top: number; avg: number; pastYou?: number }[];
}) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const angle = (i: number) => (Math.PI * 2 * i) / data.length - Math.PI / 2;

  const point = (v: number, i: number) => {
    const r = (v / 100) * radius;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };

  const polygon = (key: "you" | "top" | "avg" | "pastYou") =>
    data.map((d, i) => point((d[key] ?? 0) as number, i).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px] h-auto mx-auto">
      <defs>
        <linearGradient id="cv-you" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map((f) => {
        const r = radius * f;
        const pts = data.map((_, i) => `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`).join(" ");
        return <polygon key={f} points={pts} fill="none" stroke="hsl(var(--border))" strokeOpacity={0.4} />;
      })}
      {data.map((_, i) => {
        const [x, y] = point(100, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" strokeOpacity={0.4} />;
      })}
      <polygon points={polygon("avg")} fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.6} strokeDasharray="3 3" />
      <polygon points={polygon("top")} fill="none" stroke="hsl(var(--accent))" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="5 4" />
      <polygon points={polygon("you")} fill="url(#cv-you)" stroke="hsl(var(--primary))" strokeWidth={2} />
      {data.map((d, i) => {
        const r = radius + 18;
        const x = cx + r * Math.cos(angle(i));
        const y = cy + r * Math.sin(angle(i));
        return (
          <text
            key={d.axis}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }}
          >
            {d.axis}
          </text>
        );
      })}
    </svg>
  );
}

function AnalyzingOverlay({ messages, onDone }: { messages: string[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => {
        if (i >= messages.length - 1) {
          clearInterval(id);
          setTimeout(onDone, 700);
          return i;
        }
        return i + 1;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [messages, onDone]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-glow mb-6 animate-pulse">
          <Loader2 className="h-9 w-9 text-primary-foreground animate-spin" />
        </div>
        <p className="font-display text-2xl mb-2 text-gradient-primary">{messages[idx]}</p>
        <p className="text-sm text-muted-foreground font-mono">
          Krok {idx + 1} z {messages.length}
        </p>
      </div>
    </div>
  );
}

export default function ConversationDetail() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: result, isLoading } = useConversationResult(id);
  const status = result?.status;
  const isProcessing =
    status === "pending" ||
    status === "diarizing" ||
    status === "awaiting_speaker_selection" ||
    status === "analyzing";
  const [analyzing, setAnalyzing] = useState(
    params.get("analyzing") === "1" || (!!status && isProcessing),
  );
  const [showOther, setShowOther] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss the overlay only once the backend actually finished.
  useEffect(() => {
    if (status === "complete" || status === "failed") {
      setAnalyzing(false);
      if (params.get("analyzing")) {
        params.delete("analyzing");
        setParams(params, { replace: true });
      }
    } else if (isProcessing) {
      setAnalyzing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Mapowanie danych z backendu na format UI
  const c = useMemo(() => {
    if (!result) return null;

    const typeMeta = CONVERSATION_TYPE_META[result.conversation_type];

    return {
      id: result.id,
      type: result.conversation_type,
      typeLabel: typeMeta?.label || result.conversation_type,
      date: result.created_at,
      durationSec: result.duration_seconds,
      context: {
        stakes: result.context_stakes,
        goal: result.context_goal,
        otherParty: result.context_other_party,
      },
      overallScore: result.overall_score,
      summary: result.summary || '',
      metrics: result.metrics || [],
      timeline: result.key_events?.map(e => ({
        timestamp: e.timestamp,
        type: e.type,
        label: e.label,
        snippet: e.description || '',
      })) || [],
      moments: [], // Backend nie ma jeszcze moments of truth
      transcript: result.transcript || [],
      scorecard: result.radar_data || [],
      recommendedDrills: [], // Backend nie ma jeszcze recommended drills
      status: result.status,
      errorMessage: result.error_message,
    };
  }, [result]);

  const onAnalyzeDone = () => {
    // No-op: the effect above closes the overlay once status flips.
  };


  const scrollToLine = (start: number) => {
    const el = transcriptRef.current?.querySelector<HTMLElement>(`[data-start="${start}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-primary");
    setTimeout(() => el?.classList.remove("ring-2", "ring-primary"), 1600);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!c) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-display text-xl mb-2">Rozmowa nie znaleziona</p>
          <Button asChild variant="outline">
            <Link to="/conversations">Powrót do listy</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {analyzing && <AnalyzingOverlay messages={TYPE_ANALYZE_MESSAGES[c.type]} onDone={onAnalyzeDone} />}

      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8 lg:py-12 space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/conversations" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Wszystkie rozmowy
          </Link>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-surface border border-border text-muted-foreground">
            {c.typeLabel}
          </span>
        </div>

        {/* 1. Hero score */}
        <section className="card-premium p-7 lg:p-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">Ogólna wydajność</p>
          <div className="font-mono text-7xl md:text-8xl text-gradient-primary mb-3">{c.overallScore}</div>
          <p className="text-sm text-foreground/80 max-w-2xl mx-auto leading-relaxed">{c.summary}</p>
        </section>

        {/* 2. Context recap */}
        <section className="card-premium p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2 text-sm">
            {c.context.stakes && <p><span className="text-muted-foreground">Stawka:</span> {c.context.stakes}</p>}
            {c.context.goal && <p><span className="text-muted-foreground">Cel:</span> {c.context.goal}</p>}
            {c.context.otherParty && <p><span className="text-muted-foreground">Z:</span> {c.context.otherParty}</p>}
          </div>
          <div className="flex md:justify-end items-start gap-4 text-xs font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> {fmtDur(c.durationSec)}</span>
          </div>
        </section>

        {/* 3. Metrics */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Szczegóły wydajności</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {c.metrics.map((m) => (
              <div key={m.key} className="card-premium p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{m.label}</p>
                <p className={cn("font-mono text-2xl mb-1", m.good === false ? "text-destructive" : m.good === true ? "text-success" : "text-foreground")}>
                  {m.value}
                </p>
                <p className="text-xs text-foreground/70">{m.description}</p>
                {m.benchmark && <p className="text-[10px] text-muted-foreground font-mono mt-2">{m.benchmark}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* 4. Timeline */}
        <section className="card-premium p-5">
          <h2 className="font-display text-xl mb-4">Oś czasu</h2>
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-3 min-w-max pb-2">
              {c.timeline.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToLine(e.timestamp)}
                  className="text-left min-w-[200px] max-w-[240px] rounded-lg border border-border bg-surface p-3 hover:border-primary/50 transition-colors tap-press"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: EVENT_COLOR[e.type] }} />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{fmtTimestamp(e.timestamp)}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: EVENT_COLOR[e.type] }}>{e.type}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">{e.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">"{e.snippet}"</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Moments of Truth */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Momenty prawdy
          </h2>
          {c.moments.map((m, i) => (
            <div
              key={i}
              className="rounded-xl p-5 bg-surface space-y-3"
              style={{ boxShadow: "0 0 0 1px hsl(var(--accent) / 0.4), 0 10px 40px -10px hsl(var(--accent) / 0.2)" }}
            >
              <div className="flex items-start gap-3">
                <Quote className="h-5 w-5 text-accent shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm italic text-foreground/90 leading-relaxed mb-3">"{m.quote}"</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notatka coacha · {fmtTimestamp(m.timestamp)}</p>
                  <p className="text-sm mt-1">{m.coachNote}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-accent mt-3">Jak poradziłby sobie profesjonalista</p>
                  <p className="text-sm italic text-accent/90 mt-1">"{m.proAlternative}"</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* 6. Transcript */}
        <section className="card-premium p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Twoja strona transkrypcji</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowOther((s) => !s)}>
              {showOther ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showOther ? "Ukryj drugiego mówcę" : "Pokaż drugiego mówcę"}
            </Button>
          </div>
          <div ref={transcriptRef} className="space-y-2">
            {c.transcript.map((line, i) => {
              const isYou = line.speaker === "you";
              if (!isYou && !showOther) {
                return (
                  <div key={i} data-start={line.start} className="text-xs font-mono text-muted-foreground/40 italic px-3 py-1.5">
                    [drugi mówca — ukryty]
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  data-start={line.start}
                  className={cn(
                    "rounded-lg px-3 py-2 transition-all",
                    isYou ? "bg-primary/10 border-l-2 border-primary" : "bg-muted/30 border-l-2 border-muted",
                  )}
                >
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className={cn("font-mono text-[10px] uppercase tracking-widest", isYou ? "text-primary" : "text-muted-foreground")}>
                      {isYou ? "Ty" : "Inny"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{fmtTimestamp(line.start)}</span>
                  </div>
                  <p className="text-sm text-foreground/90">
                    {line.weakPhrases?.length
                      ? highlightWeakPhrases(line.text, line.weakPhrases)
                      : line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. Scorecard */}
        <section className="card-premium p-6">
          <h2 className="font-display text-xl mb-4">Porównanie wyników</h2>
          <ScorecardRadar data={c.scorecard} />
          <div className="flex items-center justify-center gap-5 mt-4 text-xs font-mono">
            <Legend color="hsl(var(--primary))" label="Ty" />
            <Legend color="hsl(var(--accent))" label="Najlepsi" dashed />
            <Legend color="hsl(var(--muted-foreground))" label="Średnia" dashed />
          </div>
        </section>

        {/* 8. Drills */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Polecane ćwiczenia</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {c.recommendedDrills.map((d) => (
              <div key={d.id} className="card-premium p-5 flex flex-col">
                <p className="font-display text-base mb-2">{d.title}</p>
                <p className="text-xs text-muted-foreground flex-1 mb-3">{d.why}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-success">+{d.xp} XP</span>
                  <Button asChild variant="fire" size="sm">
                    <Link to={`/drills/${d.id}`}>Rozpocznij</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Footer actions */}
        <section className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild variant="fire">
            <Link to="/conversations/new">
              <MessageSquare className="h-4 w-4" /> Analizuj kolejną rozmowę
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" /> Powrót do panelu
            </Link>
          </Button>
        </section>
      </div>
    </AppShell>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span
        className="h-2.5 w-4 rounded-sm"
        style={{
          background: dashed ? "transparent" : color,
          border: dashed ? `1.5px dashed ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

function highlightWeakPhrases(text: string, phrases: string[]) {
  // Build a regex that matches any of the weak phrases (case-insensitive)
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) && phrases.some((ph) => ph.toLowerCase() === p.toLowerCase()) ? (
      <span key={i} className="text-destructive underline decoration-dotted decoration-destructive/60 underline-offset-2">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
