/**
 * Rozszerzone obliczenia metryk z kontekstem dla Learning Results System
 */

import type { RawMetrics, SpeakerWithCategory } from "./types.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.103.3";

interface MetricWithContext {
  value: number;
  target_range: [number, number];
  your_previous_avg: number | null;
  your_personal_best: number | null;
  interpretation: string;
  delta_vs_previous: number | null;
  status: 'excellent' | 'good' | 'needs_work' | 'critical';
  examples_found?: string[];
}

interface MetricsWithContext {
  pace_wpm: MetricWithContext;
  fillers: MetricWithContext;
  pause_mastery: MetricWithContext;
  energy_variance: MetricWithContext;
  clarity: MetricWithContext;
  vocabulary: MetricWithContext;
}

type RawMetricsWithTranscript = RawMetrics & { transcript?: string };

interface PreviousAverages {
  pace_wpm: number | null;
  fillers: number | null;
  pause_mastery: number | null;
  energy_variance: number | null;
  clarity: number | null;
  vocabulary: number | null;
}

interface PersonalBests {
  pace_wpm: number | null;
  fillers: number | null;
  pause_mastery: number | null;
  energy_variance: number | null;
  clarity: number | null;
  vocabulary: number | null;
}

/**
 * Polskie filler words
 */
export const POLISH_FILLERS = [
  'no', 'eee', 'yyy', 'hmm', 'ehm', 'ee', 'yyy',
  'więc', 'tak więc', 'no więc',
  'wiecie', 'wiesz',
  'tego', 'tam',
  'jakby', 'jakoś', 'no nie',
  'po prostu', 'oczywiście',
  'znaczy', 'znaczy się',
  'kurde', 'kurczę',
  'no dobra', 'no tak',
];

/**
 * Oblicza energy variance na podstawie długości zdań
 * (uproszczona heurystyka - idealne byłoby audio amplitude analysis)
 */
export function calculateEnergyVariance(transcript: string): number {
  const sentences = transcript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length < 2) return 0;

  const lengths = sentences.map(s => s.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;

  // Normalizuj do 0-100
  return Math.min(100, Math.round(Math.sqrt(variance)));
}

/**
 * Znajduje przykłady filler words w transkrypcie
 */
export function findFillerExamples(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase();
  const found: string[] = [];

  for (const filler of POLISH_FILLERS) {
    if (lowerTranscript.includes(filler)) {
      found.push(filler);
      if (found.length >= 5) break; // Max 5 przykładów
    }
  }

  return found;
}

/**
 * Pobiera poprzednie średnie usera dla wszystkich metryk
 */
async function getPreviousAverages(
  admin: SupabaseClient,
  userId: string
): Promise<PreviousAverages> {
  const { data } = await admin
    .from('user_skill_progress')
    .select('skill_name, value')
    .eq('user_id', userId)
    .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('measurement_date', { ascending: false });

  if (!data || data.length === 0) {
    return {
      pace_wpm: null,
      fillers: null,
      pause_mastery: null,
      energy_variance: null,
      clarity: null,
      vocabulary: null,
    };
  }

  const grouped = data.reduce((acc, row) => {
    if (!acc[row.skill_name]) acc[row.skill_name] = [];
    acc[row.skill_name].push(row.value);
    return acc;
  }, {} as Record<string, number[]>);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    pace_wpm: grouped.pace_wpm ? avg(grouped.pace_wpm) : null,
    fillers: grouped.fillers ? avg(grouped.fillers) : null,
    pause_mastery: grouped.pause_mastery ? avg(grouped.pause_mastery) : null,
    energy_variance: grouped.energy_variance ? avg(grouped.energy_variance) : null,
    clarity: grouped.clarity ? avg(grouped.clarity) : null,
    vocabulary: grouped.vocabulary ? avg(grouped.vocabulary) : null,
  };
}

/**
 * Pobiera personal bests usera
 */
async function getPersonalBests(
  admin: SupabaseClient,
  userId: string
): Promise<PersonalBests> {
  const { data } = await admin
    .from('personal_records')
    .select('metric_name, best_value')
    .eq('user_id', userId);

  if (!data || data.length === 0) {
    return {
      pace_wpm: null,
      fillers: null,
      pause_mastery: null,
      energy_variance: null,
      clarity: null,
      vocabulary: null,
    };
  }

  const records = data.reduce((acc, row) => {
    acc[row.metric_name] = row.best_value;
    return acc;
  }, {} as Record<string, number>);

  return {
    pace_wpm: records.pace_wpm || null,
    fillers: records.fillers || null,
    pause_mastery: records.pause_mastery || null,
    energy_variance: records.energy_variance || null,
    clarity: records.clarity || null,
    vocabulary: records.vocabulary || null,
  };
}

/**
 * Interpretuje pace WPM
 */
function interpretPace(value: number, target: [number, number]): string {
  const [min, max] = target;
  if (value < min - 20) return `Zdecydowanie za wolno. Brzmiałeś jak ktoś kto się waha. Klient odpadł.`;
  if (value < min) return `Trochę za wolno. Brakuje energii i pewności.`;
  if (value >= min && value <= max) return `W złotym zakresie. Tempo daje klarowność i pewność.`;
  if (value > max && value <= max + 20) return `Trochę za szybko. Ryzykujesz że klient nie nadąży.`;
  return `Zdecydowanie za szybko. Brzmiałeś jak ktoś kto ucieka. Nikt nie zrozumiał.`;
}

/**
 * Interpretuje filler words
 */
function interpretFillers(count: number, durationMinutes: number): string {
  const perMinute = count / durationMinutes;
  if (perMinute === 0) return `Zero fillerów. Perfekcja. Brzmiałeś jak profesjonalista.`;
  if (perMinute <= 1) return `Minimalne fillery. Bardzo dobrze kontrolowane.`;
  if (perMinute <= 3) return `Kilka fillerów. Zauważalne ale nie krytyczne.`;
  if (perMinute <= 5) return `Dużo fillerów. Sygnalizujesz niepewność. Klient to czuje.`;
  return `Masa fillerów. Brzmiałeś jak ktoś kto nie wie o czym mówi. Katastrofa.`;
}

/**
 * Klasyfikuje metrykę do statusu
 */
function classifyMetric(value: number, target: [number, number], inverse: boolean = false): 'excellent' | 'good' | 'needs_work' | 'critical' {
  const [min, max] = target;

  if (inverse) {
    // Dla metryk gdzie niższe = lepsze (fillers, energy_variance)
    if (value <= min) return 'excellent';
    if (value <= max) return 'good';
    if (value <= max * 1.5) return 'needs_work';
    return 'critical';
  } else {
    // Dla metryk gdzie wyższe = lepsze
    if (value >= max) return 'excellent';
    if (value >= min) return 'good';
    if (value >= min * 0.8) return 'needs_work';
    return 'critical';
  }
}

/**
 * Buduje pełny kontekst dla wszystkich metryk
 */
export async function buildMetricsWithContext(
  rawMetrics: RawMetricsWithTranscript,
  speaker: SpeakerWithCategory,
  admin: SupabaseClient,
  userId: string
): Promise<MetricsWithContext> {
  // Pobierz poprzednie średnie i personal bests
  const [previousAvg, personalBests] = await Promise.all([
    getPreviousAverages(admin, userId),
    getPersonalBests(admin, userId),
  ]);

  // Targety dla kategorii (można rozszerzyć o category-specific targets)
  const targets = {
    pace_wpm: [155, 180] as [number, number],
    fillers: [0, 2] as [number, number],
    pause_mastery: [70, 100] as [number, number],
    energy_variance: [20, 50] as [number, number],
    clarity: [70, 100] as [number, number],
    vocabulary: [60, 100] as [number, number],
  };

  // Oblicz energy variance
  const energyVariance = calculateEnergyVariance(rawMetrics.transcript || '');

  // Znajdź przykłady fillerów
  const fillerExamples = findFillerExamples(rawMetrics.transcript || '');

  return {
    pace_wpm: {
      value: rawMetrics.wpm,
      target_range: targets.pace_wpm,
      your_previous_avg: previousAvg.pace_wpm,
      your_personal_best: personalBests.pace_wpm,
      interpretation: interpretPace(rawMetrics.wpm, targets.pace_wpm),
      delta_vs_previous: previousAvg.pace_wpm ? rawMetrics.wpm - previousAvg.pace_wpm : null,
      status: classifyMetric(rawMetrics.wpm, targets.pace_wpm),
    },
    fillers: {
      value: rawMetrics.total_filler_count,
      target_range: targets.fillers,
      your_previous_avg: previousAvg.fillers,
      your_personal_best: personalBests.fillers,
      interpretation: interpretFillers(rawMetrics.total_filler_count, rawMetrics.duration_seconds / 60),
      delta_vs_previous: previousAvg.fillers ? rawMetrics.total_filler_count - previousAvg.fillers : null,
      status: classifyMetric(rawMetrics.total_filler_count, targets.fillers, true),
      examples_found: fillerExamples,
    },
    pause_mastery: {
      value: rawMetrics.pause_mastery_score,
      target_range: targets.pause_mastery,
      your_previous_avg: previousAvg.pause_mastery,
      your_personal_best: personalBests.pause_mastery,
      interpretation: rawMetrics.pause_mastery_score >= 80
        ? `Pauzy używane strategicznie. Profesjonalny poziom.`
        : rawMetrics.pause_mastery_score >= 60
        ? `Pauzy obecne ale nie zawsze w dobrych momentach.`
        : `Za mało pauz. Brzmiałeś jak ktoś kto się spieszy.`,
      delta_vs_previous: previousAvg.pause_mastery ? rawMetrics.pause_mastery_score - previousAvg.pause_mastery : null,
      status: classifyMetric(rawMetrics.pause_mastery_score, targets.pause_mastery),
    },
    energy_variance: {
      value: energyVariance,
      target_range: targets.energy_variance,
      your_previous_avg: previousAvg.energy_variance,
      your_personal_best: personalBests.energy_variance,
      interpretation: energyVariance >= 40 && energyVariance <= 60
        ? `Dobra wariancja energii. Dynamiczny ale kontrolowany.`
        : energyVariance < 40
        ? `Za monotonny. Brakuje dynamiki i emocji.`
        : `Za chaotyczny. Energia bez kontroli.`,
      delta_vs_previous: previousAvg.energy_variance ? energyVariance - previousAvg.energy_variance : null,
      status: classifyMetric(energyVariance, targets.energy_variance),
    },
    clarity: {
      value: rawMetrics.vocab_depth_score,
      target_range: targets.clarity,
      your_previous_avg: previousAvg.clarity,
      your_personal_best: personalBests.clarity,
      interpretation: rawMetrics.vocab_depth_score >= 80
        ? `Krystalicznie jasny przekaz. Każde słowo zrozumiałe.`
        : rawMetrics.vocab_depth_score >= 60
        ? `Klarowność OK ale są momenty mętne.`
        : `Niejasny przekaz. Klient nie zrozumiał co chcesz powiedzieć.`,
      delta_vs_previous: previousAvg.clarity ? rawMetrics.vocab_depth_score - previousAvg.clarity : null,
      status: classifyMetric(rawMetrics.vocab_depth_score, targets.clarity),
    },
    vocabulary: {
      value: Math.round((rawMetrics.unique_word_ratio || 0) * 100),
      target_range: targets.vocabulary,
      your_previous_avg: previousAvg.vocabulary,
      your_personal_best: personalBests.vocabulary,
      interpretation: (rawMetrics.unique_word_ratio || 0) >= 0.7
        ? `Bogate słownictwo. Precyzyjne słowa zamiast ogólników.`
        : (rawMetrics.unique_word_ratio || 0) >= 0.5
        ? `Słownictwo OK ale powtarzasz się.`
        : `Ubogie słownictwo. Powtarzasz te same słowa w kółko.`,
      delta_vs_previous: previousAvg.vocabulary ? Math.round((rawMetrics.unique_word_ratio || 0) * 100) - previousAvg.vocabulary : null,
      status: classifyMetric(Math.round((rawMetrics.unique_word_ratio || 0) * 100), targets.vocabulary),
    },
  };
}

/**
 * Zapisuje metryki do user_skill_progress
 */
export async function saveSkillProgress(
  admin: SupabaseClient,
  userId: string,
  recordingId: string,
  metrics: MetricsWithContext
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const rows = [
    { user_id: userId, skill_name: 'pace_wpm', value: metrics.pace_wpm.value, measurement_date: today, recording_id: recordingId },
    { user_id: userId, skill_name: 'fillers', value: metrics.fillers.value, measurement_date: today, recording_id: recordingId },
    { user_id: userId, skill_name: 'pause_mastery', value: metrics.pause_mastery.value, measurement_date: today, recording_id: recordingId },
    { user_id: userId, skill_name: 'energy_variance', value: metrics.energy_variance.value, measurement_date: today, recording_id: recordingId },
    { user_id: userId, skill_name: 'clarity', value: metrics.clarity.value, measurement_date: today, recording_id: recordingId },
    { user_id: userId, skill_name: 'vocabulary', value: metrics.vocabulary.value, measurement_date: today, recording_id: recordingId },
  ];

  const { error } = await admin
    .from('user_skill_progress')
    .insert(rows);

  if (error) {
    console.error('Failed to save skill progress:', error);
    throw error;
  }
}
