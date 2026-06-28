import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/results/ScoreRing";
import { MentorAvatar } from "@/components/results/MentorAvatar";
import { MentorFeedbackSections } from "@/components/results/MentorFeedbackSections";
import { MetricTile } from "@/components/results/MetricTile";
import { FillerChart } from "@/components/results/FillerChart";
import { Transcript } from "@/components/results/Transcript";
import { VerdictBanner } from "@/components/results/VerdictBanner";
import { MetricsGrid } from "@/components/results/MetricsGrid";
import { WhatWasWrong } from "@/components/results/WhatWasWrong";
import { HowToFix } from "@/components/results/HowToFix";
import { NextStepCard } from "@/components/results/NextStepCard";
import { WeakestStrongestBadges } from "@/components/results/WeakestStrongestBadges";
import { HeroStrip } from "@/components/results/HeroStrip";
import { SectionHeader } from "@/components/results/SectionHeader";
import { MentorMonogramBackdrop } from "@/components/results/MentorMonogramBackdrop";
import { BrutalCTA } from "@/components/results/BrutalCTA";
import { useResults } from "@/hooks/queries";
import { useTrajectory } from "@/hooks/queries/useTrajectory";
import { TrajectorySection } from "@/components/results/TrajectorySection";
import { LearnSection } from "@/components/results/LearnSection";
import { ChessTimelineSection } from "@/components/chess-results/ChessTimelineSection";
import type { SentenceAnalysis } from "@/components/chess-results/types";
import { SPEAKERS } from "@/data/speakers";
import { CATEGORY_BY_ID } from "@/data/categories";

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: result, isLoading, error } = useResults(id);
  const { data: trajectoryPoints = [] } = useTrajectory(result?.user_id, 10);
  const xpToastedFor = useRef<string | null>(null);

  // Toast XP tylko raz per recording_id
  useEffect(() => {
    const xp = result?.analysis?.xp_awarded;
    const recId = result?.id;
    if (xp && recId && xpToastedFor.current !== recId) {
      xpToastedFor.current = recId;
      toast.success(`+${xp} XP zdobyte!`, { description: "Utrzymuj passę." });
    }
  }, [result?.analysis?.xp_awarded, result?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie wyników...</p>
        </div>
      </div>
    );
  }

  if (error || !result || !result.analysis) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl mb-4">Nie znaleziono wyników</h1>
          <p className="text-muted-foreground mb-6">
            {error
              ? "Nie udało się załadować wyników."
              : "To nagranie nie zostało jeszcze przeanalizowane."}
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            <Home />
            Powrót do panelu
          </Button>
        </div>
      </div>
    );
  }

  const analysis = result.analysis as any;
  const speaker = result.speaker;
  const fillerCounts = (analysis.filler_words_detected as Record<string, number>) || {};
  const topFillers = Object.entries(fillerCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const wpmLow = speaker?.ideal_wpm_min || 120;
  const wpmHigh = speaker?.ideal_wpm_max || 160;

  const mentorData = SPEAKERS.find((s) => s.id === speaker?.id);
  const category = mentorData?.category || "sales";
  const cat = CATEGORY_BY_ID[category];
  const accentColor = `hsl(var(--${cat.accentVar}))`;
  const monogram = speaker?.monogram || "TR";
  const mentorName = speaker?.name || "Trener";

  // ── Twardy guard na fallbacki ──────────────────────────────────────────────
  const verdictQuote = (analysis.feedback_summary ?? "").trim();
  const hasVerdictQuote = verdictQuote.length > 20;

  const wins: string[] = Array.isArray(analysis.mentor_wins)
    ? analysis.mentor_wins.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  const violationsArr: string[] = Array.isArray(analysis.mentor_violations)
    ? analysis.mentor_violations
        .map((v: any) => (typeof v === "string" ? v : v?.diagnosis ?? v?.moment))
        .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  // Energy/clarity — pokazuj "—" jeśli null/0 zamiast mylącego zera
  const energyVal =
    typeof analysis.energy_variance_score === "number" && analysis.energy_variance_score > 0
      ? String(Math.round(analysis.energy_variance_score))
      : "—";
  const clarityVal =
    typeof analysis.clarity_score === "number" && analysis.clarity_score > 0
      ? String(Math.round(analysis.clarity_score))
      : "—";

  // Closing line — używamy pola z DB, NIE sampleFeedback z static catalogu
  const closingLine: string =
    typeof analysis.mentor_closing_line === "string" && analysis.mentor_closing_line.trim().length > 0
      ? analysis.mentor_closing_line.trim()
      : "";

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <HeroStrip
        score={analysis.overall_score || 0}
        verdictLabel={analysis.verdict_label}
        verdictQuote={hasVerdictQuote ? verdictQuote : null}
        mentorMonogram={monogram}
        mentorName={mentorName}
        mentorCategory={category}
        accentColor={accentColor}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 md:py-14 space-y-12">
        {/* Hero pełny — mentor + monogram w tle (bez dubla ringu, ten jest w sticky) */}
        <header className="relative text-center py-8">
          <MentorMonogramBackdrop monogram={monogram} accentColor={accentColor} />
          <div className="relative space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Twój raport · Mentor
            </div>
            <div className="flex justify-center">
              <MentorAvatar
                monogram={monogram}
                name={mentorName}
                category={category}
                size="lg"
              />
            </div>
          </div>
        </header>

        {/* SEKCJA 1 — WERDYKT */}
        <section id="section-1" className="space-y-6">
          {analysis.verdict_label && (
            <VerdictBanner
              label={analysis.verdict_label}
              score={analysis.overall_score || 0}
              accentColor={accentColor}
            />
          )}

          {analysis.weakest_dimension && analysis.strongest_dimension && (
            <WeakestStrongestBadges
              weakest={analysis.weakest_dimension}
              strongest={analysis.strongest_dimension}
            />
          )}

          {hasVerdictQuote && (
            <div
              className="card-brutal p-7 md:p-10 relative"
              style={{ borderLeftColor: accentColor }}
            >
              <SectionHeader
                number={1}
                kicker="Werdykt"
                title={`Co by Ci powiedział ${mentorName}`}
                accentColor={accentColor}
              />
              <p
                className="mentor-dropcap text-xl md:text-2xl leading-relaxed italic"
                style={{ fontFamily: "Georgia, serif", color: accentColor }}
              >
                "{verdictQuote}"
              </p>
            </div>
          )}
        </section>

        {/* SEKCJA 1.5 — CHESS TIMELINE (per-zdanie) */}
        {(() => {
          const sa = analysis.sentence_analyses;
          const hasSentences = Array.isArray(sa) && sa.length > 0;
          const createdAt = result.created_at ? new Date(result.created_at).getTime() : 0;
          const isFresh = createdAt > 0 && Date.now() - createdAt < 300_000;

          if (hasSentences) {
            return (
              <section id="section-chess">
                <ChessTimelineSection
                  sentences={sa as unknown as SentenceAnalysis[]}
                  durationSeconds={result.duration_seconds || 60}
                  mentorName={mentorName}
                  mentorAvatar={monogram}
                  mentorAccentColor={accentColor}
                  mentorId={speaker?.id || ""}
                />
              </section>
            );
          }

          if (isFresh) {
            return (
              <section
                id="section-chess-pending"
                className="card-brutal p-6 md:p-8 text-center space-y-3"
                style={{ borderLeftColor: accentColor }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Per-zdanie analiza tworzy się...
                </div>
                <p className="text-base text-muted-foreground max-w-md mx-auto">
                  Mentor analizuje każde zdanie osobno. Odśwież za chwilę.
                </p>
                <Button onClick={() => window.location.reload()} size="sm">
                  Odśwież
                </Button>
              </section>
            );
          }

          return null;
        })()}

        {/* SEKCJA 2 — DIAGNOZA */}
        {(analysis.what_was_wrong || analysis.how_to_fix) && (
          <section id="section-2" className="space-y-6">
            <SectionHeader
              number={2}
              kicker="Diagnoza"
              title="Co poszło nie tak — i jak to naprawić"
              accentColor={accentColor}
            />

            {analysis.what_was_wrong && (
              <WhatWasWrong
                moment={analysis.what_was_wrong.moment ?? analysis.what_was_wrong.moment_from_session ?? ""}
                diagnosis={analysis.what_was_wrong.diagnosis ?? ""}
                whatClientThought={analysis.what_was_wrong.what_client_thought ?? ""}
                accentColor={accentColor}
              />
            )}

            {analysis.how_to_fix && (
              <HowToFix
                insteadOf={analysis.how_to_fix.instead_of ?? analysis.how_to_fix.instead_of_this ?? ""}
                sayThis={analysis.how_to_fix.say_this ?? ""}
                whyThisWorks={analysis.how_to_fix.why_this_works ?? ""}
                accentColor={accentColor}
              />
            )}
          </section>
        )}

        {/* SEKCJA 3 — LICZBY */}
        <section id="section-3" className="space-y-5">
          <SectionHeader
            number={3}
            kicker="Liczby"
            title="Twoje metryki tej sesji"
            accentColor={accentColor}
          />

          {analysis.metrics_with_context ? (
            <MetricsGrid metricsWithContext={analysis.metrics_with_context} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricTile
                label="Słów / Min"
                value={String(analysis.wpm || 0)}
                goodDirection="up"
                hint={`Cel ${wpmLow}–${wpmHigh}`}
              />
              <MetricTile
                label="Słowa wypełniacze"
                value={String(analysis.filler_word_count || 0)}
                goodDirection="down"
                hint={
                  analysis.filler_word_count && analysis.filler_word_count > 10
                    ? "Wyeliminuj je"
                    : "Solidnie"
                }
              />
              <MetricTile
                label="Mistrzostwo pauz"
                value={String(Math.round(analysis.pause_mastery_score || 0))}
                goodDirection="up"
              />
              <MetricTile label="Wariancja energii" value={energyVal} goodDirection="up" />
              <MetricTile label="Klarowność" value={clarityVal} goodDirection="up" />
              <MetricTile
                label="Słownictwo"
                value={String(Math.round(analysis.vocabulary_depth_score || 0))}
                goodDirection="up"
              />
            </div>
          )}

          {/* What Mentor Loved / Hated — tylko jeśli MA realne dane */}
          {(wins.length > 0 || violationsArr.length > 0) && (
            <MentorFeedbackSections
              mentorName={mentorName}
              loved={wins}
              hated={violationsArr}
              accentColor={accentColor}
            />
          )}

          {topFillers.length > 0 && (
            <div className="card-brutal p-6 md:p-8" style={{ borderLeftColor: accentColor }}>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                    Najczęstsze wypełniacze
                  </div>
                  <h3 className="font-display text-2xl">Wyeliminuj je najpierw</h3>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {topFillers.reduce((s, f) => s + f.count, 0)} łącznie
                </div>
              </div>
              <FillerChart data={topFillers} />
            </div>
          )}
        </section>

        {/* SEKCJA 4 — TRAJEKTORIA */}
        <section id="section-4">
          <TrajectorySection
            points={trajectoryPoints}
            currentAnalysis={{
              wpm: analysis.wpm,
              filler_word_count: analysis.filler_word_count,
              pause_mastery_score: analysis.pause_mastery_score,
              vocabulary_depth_score: analysis.vocabulary_depth_score,
              overall_score: analysis.overall_score,
            }}
            accentColor={accentColor}
          />
        </section>

        {/* SEKCJA 5 — NASTĘPNY KROK */}
        {analysis.next_step && (
          <section id="section-5">
            <NextStepCard
              drillRecommendationReason={analysis.next_step.drill_recommendation_reason}
              mentorPushToAction={analysis.next_step.mentor_push_to_action}
              accentColor={accentColor}
              onStartDrill={() => navigate("/drills")}
            />
          </section>
        )}

        {/* Transcript */}
        {result.transcript && (
          <section>
            <Transcript text={result.transcript} fillers={Object.keys(fillerCounts)} />
          </section>
        )}

        {/* Closing line z bazy — TYLKO jeśli istnieje */}
        {closingLine && (
          <section
            className="card-brutal p-7 md:p-9 relative"
            style={{ borderLeftColor: accentColor }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3"
              style={{ color: accentColor }}
            >
              {mentorName} · ostatnie słowo
            </div>
            <p
              className="text-2xl md:text-3xl leading-snug italic"
              style={{ fontFamily: "Georgia, serif" }}
            >
              "{closingLine}"
            </p>
          </section>
        )}

        {/* SEKCJA 6 — NAUKA */}
        <section id="section-6">
          <LearnSection weakestDimension={analysis.weakest_dimension} accentColor={accentColor} />
        </section>

        {/* Footer CTA — brutal */}
        <BrutalCTA
          accentColor={accentColor}
          mentorName={mentorName}
          onRetry={() => navigate("/record")}
          onDrill={() => navigate("/drills")}
          onHome={() => navigate("/dashboard")}
        />
      </div>
    </div>
  );
}
