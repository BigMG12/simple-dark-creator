/**
 * Integracja nowych metryk z kontekstem do analyze-recording
 * Pomocniczy moduł dla Fazy 2 Megaprompt 2
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.103.3";
import type { RawMetrics, SpeakerWithCategory } from "./types.ts";
import type { MentorAnalysisResponseV2 } from "./mentor-prompt-builder-v2.ts";
import { buildMetricsWithContext, saveSkillProgress } from "./metrics-with-context.ts";

interface EnhancedAnalysisData {
  verdict_label: string;
  mentor_quote_responsive: string;
  what_was_wrong: any;
  how_to_fix: any;
  metrics_with_context: any;
  next_step: any;
  weakest_dimension: string;
  strongest_dimension: string;
}

type MetricStatus = 'critical' | 'needs_work' | 'good' | 'excellent';

/**
 * Oblicza verdict_label na podstawie score
 */
export function calculateVerdictLabel(score: number): string {
  if (score >= 90) return 'Mistrzowski';
  if (score >= 71) return 'Mocny';
  if (score >= 41) return 'Solidny';
  return 'Surowy';
}

/**
 * Znajduje najsłabszy i najmocniejszy wymiar
 */
function findWeakestAndStrongest(metricsWithContext: any): { weakest: string; strongest: string } {
  const metrics: Array<{ name: string; status: MetricStatus }> = [
    { name: 'pace_wpm', status: metricsWithContext.pace_wpm.status },
    { name: 'fillers', status: metricsWithContext.fillers.status },
    { name: 'pause_mastery', status: metricsWithContext.pause_mastery.status },
    { name: 'energy_variance', status: metricsWithContext.energy_variance.status },
    { name: 'clarity', status: metricsWithContext.clarity.status },
    { name: 'vocabulary', status: metricsWithContext.vocabulary.status },
  ];

  const statusOrder: Record<MetricStatus, number> = { critical: 0, needs_work: 1, good: 2, excellent: 3 };

  const sorted = metrics.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return {
    weakest: sorted[0].name,
    strongest: sorted[sorted.length - 1].name,
  };
}

/**
 * Przetwarza odpowiedź V2 i dodaje rozszerzone dane
 */
export async function enhanceAnalysisWithMetrics(
  mentorAnalysisV2: MentorAnalysisResponseV2,
  rawMetrics: RawMetrics,
  speaker: SpeakerWithCategory,
  admin: SupabaseClient,
  userId: string,
  recordingId: string,
  transcript: string
): Promise<EnhancedAnalysisData> {
  // Dodaj transcript do rawMetrics (potrzebny dla energy_variance)
  const enrichedMetrics = { ...rawMetrics, transcript };

  // Zbuduj metryki z kontekstem
  const metricsWithContext = await buildMetricsWithContext(
    enrichedMetrics as any,
    speaker,
    admin,
    userId
  );

  // Zapisz do user_skill_progress (trigger auto-update personal_records)
  await saveSkillProgress(admin, userId, recordingId, metricsWithContext);

  // Znajdź weakest i strongest
  const { weakest, strongest } = findWeakestAndStrongest(metricsWithContext);

  // Oblicz verdict_label
  const verdictLabel = calculateVerdictLabel(mentorAnalysisV2.verdict_score_0_100);

  return {
    verdict_label: verdictLabel,
    mentor_quote_responsive: mentorAnalysisV2.mentor_quote_responsive_to_session,
    what_was_wrong: mentorAnalysisV2.what_was_concrete_problem,
    how_to_fix: mentorAnalysisV2.concrete_prescription,
    metrics_with_context: metricsWithContext,
    next_step: {
      drill_recommendation_reason: mentorAnalysisV2.next_drill_recommendation.why_this_drill,
      mentor_push_to_action: mentorAnalysisV2.push_to_action,
    },
    weakest_dimension: weakest,
    strongest_dimension: strongest,
  };
}
