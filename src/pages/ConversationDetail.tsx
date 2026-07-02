import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
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
import { CATEGORY_BY_ID } from "@/data/categories";
import { cn } from "@/lib/utils";
import { HeroStrip } from "@/components/results/HeroStrip";
import { MentorMonogramBackdrop } from "@/components/results/MentorMonogramBackdrop";
import { MentorAvatar } from "@/components/results/MentorAvatar";
import { VerdictBanner } from "@/components/results/VerdictBanner";
import { WeakestStrongestBadges } from "@/components/results/WeakestStrongestBadges";
import { SectionHeader } from "@/components/results/SectionHeader";
import { MetricTile } from "@/components/results/MetricTile";
import { BrutalCTA } from "@/components/results/BrutalCTA";
import { ConversationTimeline } from "@/components/results/ConversationTimeline";

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
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function verdictFromScore(score: number): "Surowy" | "Solidny" | "Mocny" | "Mistrzowski" {
  if (score >= 90) return "Mistrzowski";
  if (score >= 75) return "Mocny";
  if (score >= 55) return "Solidny";
  return "Surowy";
}

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

export default function ConversationDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
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

  const c = useMemo(() => {
    if (!result) return null;
    const typeMeta = CONVERSATION_TYPE_META[result.conversation_type];
    return {
      id: result.id,
      type: result.conversation_type,
      typeMeta,
      typeLabel: typeMeta?.label || result.conversation_type,
      date: result.created_at,
      durationSec: result.duration_seconds,
      context: {
        stakes: result.context_stakes,
        goal: result.context_goal,
        otherParty: result.context_other_party,
      },
      overallScore: result.overall_score,
      summary: result.summary || "",
      metrics: result.metrics || [],
      timeline:
        result.key_events?.map((e) => ({
          timestamp: e.timestamp,
          type: e.type,
          label: e.label,
          snippet: e.description || "",
        })) || [],
      moments: [] as Array<{
        quote: string;
        timestamp: number;
        coachNote: string;
        proAlternative: string;
      }>,
      transcript: result.transcript || [],
      scorecard: result.radar_data || [],
      status: result.status,
      errorMessage: result.error_message,
    };
  }, [result]);

  const onAnalyzeDone = () => {};

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

  const categoryId = c.typeMeta.categoryId;
  const cat = CATEGORY_BY_ID[categoryId];
  const accentColor = `hsl(var(--${cat.accentVar}))`;
  const monogram = c.typeMeta.monogram;
  const mentorName = c.typeMeta.mentorName;
  const verdictLabel = verdictFromScore(c.overallScore || 0);
  const hasVerdictQuote = c.summary.trim().length > 20;

  // Weakest / strongest metric
  const badMetric = c.metrics.find((m) => m.good === false);
  const goodMetric = c.metrics.find((m) => m.good === true);

  return (
    <AppShell>
      {analyzing && <AnalyzingOverlay messages={TYPE_ANALYZE_MESSAGES[c.type]} onDone={onAnalyzeDone} />}

      <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <HeroStrip
          score={c.overallScore || 0}
          verdictLabel={verdictLabel}
          verdictQuote={hasVerdictQuote ? c.summary : null}
          mentorMonogram={monogram}
          mentorName={mentorName}
          mentorCategory={categoryId}
          accentColor={accentColor}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-5 lg:px-8 py-8 lg:py-12 space-y-12">
          <div className="flex items-center justify-between">
            <Link
              to="/conversations"
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Wszystkie rozmowy
            </Link>
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-surface border border-border"
              style={{ color: accentColor }}
            >
              {c.typeLabel}
            </span>
          </div>

          {/* Header: mentor backdrop + avatar */}
          <header className="relative text-center py-8">
            <MentorMonogramBackdrop monogram={monogram} accentColor={accentColor} />
            <div className="relative space-y-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                Twój raport · Rozmowa
              </div>
              <div className="flex justify-center">
                <MentorAvatar monogram={monogram} name={mentorName} category={categoryId} size="lg" />
              </div>
            </div>
          </header>

          {/* SEKCJA 1 — WERDYKT */}
          <section id="section-1" className="space-y-6">
            <VerdictBanner label={verdictLabel} score={c.overallScore || 0} accentColor={accentColor} />

            {badMetric && goodMetric && (
              <WeakestStrongestBadges weakest={badMetric.key} strongest={goodMetric.key} />
            )}

            {hasVerdictQuote && (
              <div className="card-brutal p-7 md:p-10 relative" style={{ borderLeftColor: accentColor }}>
                <SectionHeader
                  number={1}
                  kicker="Werdykt"
                  title={c.typeMeta.verdictKicker}
                  accentColor={accentColor}
                />
                <p
                  className="mentor-dropcap text-xl md:text-2xl leading-relaxed italic"
                  style={{ fontFamily: "Georgia, serif", color: accentColor }}
                >
                  "{c.summary}"
                </p>
              </div>
            )}
          </section>

          {/* SEKCJA 2 — KONTEKST */}
          {(c.context.stakes || c.context.goal || c.context.otherParty) && (
            <section id="section-2" className="space-y-5">
              <SectionHeader number={2} kicker="Kontekst" title="Sytuacja tej rozmowy" accentColor={accentColor} />
              <div className="card-brutal p-6 md:p-7" style={{ borderLeftColor: accentColor }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {c.context.stakes && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
                        Stawka
                      </div>
                      <p className="text-sm text-foreground/90">{c.context.stakes}</p>
                    </div>
                  )}
                  {c.context.goal && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
                        Cel
                      </div>
                      <p className="text-sm text-foreground/90">{c.context.goal}</p>
                    </div>
                  )}
                  {c.context.otherParty && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
                        Rozmówca
                      </div>
                      <p className="text-sm text-foreground/90">{c.context.otherParty}</p>
                    </div>
                  )}
                </div>
                <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />{" "}
                    {new Date(c.date).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {fmtDur(c.durationSec)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* SEKCJA 3 — OŚ CZASU */}
          {c.timeline.length > 0 && (
            <section id="section-3" className="space-y-5">
              <SectionHeader
                number={3}
                kicker="Chess Timeline"
                title="Kluczowe momenty rozmowy"
                accentColor={accentColor}
              />
              <ConversationTimeline
                events={c.timeline}
                durationSec={c.durationSec}
                accentColor={accentColor}
                onJump={scrollToLine}
              />
            </section>
          )}

          {/* SEKCJA 4 — LICZBY */}
          {c.metrics.length > 0 && (
            <section id="section-4" className="space-y-5">
              <SectionHeader number={4} kicker="Liczby" title="Twoje metryki tej rozmowy" accentColor={accentColor} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {c.metrics.map((m) => (
                  <MetricTile
                    key={m.key}
                    label={m.label}
                    value={String(m.value)}
                    goodDirection="up"
                    hint={m.benchmark || m.description}
                    alert={m.good === false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SEKCJA 5 — MOMENTY PRAWDY */}
          {c.moments.length > 0 && (
            <section id="section-5" className="space-y-5">
              <SectionHeader
                number={5}
                kicker="Momenty prawdy"
                title="Punkty zwrotne rozmowy"
                accentColor={accentColor}
              />
              {c.moments.map((m, i) => (
                <div
                  key={i}
                  className="card-brutal p-6 md:p-7 space-y-3"
                  style={{ borderLeftColor: accentColor }}
                >
                  <div className="flex items-start gap-3">
                    <Quote className="h-5 w-5 shrink-0 mt-1" style={{ color: accentColor }} />
                    <div className="flex-1">
                      <p className="text-sm italic text-foreground/90 leading-relaxed mb-3">"{m.quote}"</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        Notatka coacha · {fmtDur(m.timestamp)}
                      </p>
                      <p className="text-sm mt-1">{m.coachNote}</p>
                      <p
                        className="font-mono text-[10px] uppercase tracking-[0.3em] mt-3"
                        style={{ color: accentColor }}
                      >
                        Jak zrobiłby to profesjonalista
                      </p>
                      <p className="text-sm italic mt-1" style={{ color: accentColor }}>
                        "{m.proAlternative}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* SEKCJA 6 — TRANSKRYPT */}
          {c.transcript.length > 0 && (
            <section id="section-6" className="space-y-5">
              <SectionHeader number={6} kicker="Transkrypt" title="Twoja strona rozmowy" accentColor={accentColor} />
              <div className="card-brutal p-6" style={{ borderLeftColor: accentColor }}>
                <div className="flex items-center justify-end mb-4">
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
                        <div
                          key={i}
                          data-start={line.start}
                          className="text-xs font-mono text-muted-foreground/40 italic px-3 py-1.5"
                        >
                          [drugi mówca — ukryty]
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        data-start={line.start}
                        className={cn(
                          "rounded-lg px-3 py-2 transition-all border-l-2",
                          isYou ? "bg-primary/10" : "bg-muted/30 border-muted",
                        )}
                        style={isYou ? { borderLeftColor: accentColor } : undefined}
                      >
                        <div className="flex items-baseline gap-3 mb-1">
                          <span
                            className="font-mono text-[10px] uppercase tracking-widest"
                            style={{ color: isYou ? accentColor : "hsl(var(--muted-foreground))" }}
                          >
                            {isYou ? "Ty" : "Inny"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {fmtDur(line.start)}
                          </span>
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
              </div>
            </section>
          )}

          {/* SEKCJA 7 — SCORECARD */}
          {c.scorecard.length > 0 && (
            <section id="section-7" className="space-y-5">
              <SectionHeader
                number={7}
                kicker="Porównanie"
                title="Ty vs najlepsi vs średnia"
                accentColor={accentColor}
              />
              <div className="card-brutal p-6" style={{ borderLeftColor: accentColor }}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Radar performansu
                  </span>
                </div>
                <ScorecardRadar data={c.scorecard} />
                <div className="flex items-center justify-center gap-5 mt-4 text-xs font-mono">
                  <Legend color="hsl(var(--primary))" label="Ty" />
                  <Legend color="hsl(var(--accent))" label="Najlepsi" dashed />
                  <Legend color="hsl(var(--muted-foreground))" label="Średnia" dashed />
                </div>
              </div>
            </section>
          )}

          {/* CTA */}
          <BrutalCTA
            accentColor={accentColor}
            mentorName={mentorName}
            onRetry={() => navigate("/conversations/new")}
            onDrill={() => navigate("/conversations")}
            onHome={() => navigate("/dashboard")}
          />
        </div>
      </div>
    </AppShell>
  );
}
