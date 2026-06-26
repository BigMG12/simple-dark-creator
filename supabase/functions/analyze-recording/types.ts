// ---------------------------------------------------------------------------
// Whisper API types
// ---------------------------------------------------------------------------

export interface WhisperWord {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WhisperVerboseResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  words: WhisperWord[];
  segments: WhisperSegment[];
}

// ---------------------------------------------------------------------------
// Metrics & analysis types
// ---------------------------------------------------------------------------

export interface DetectedPause {
  start: number; // seconds (end of prev word)
  end: number;   // seconds (start of next word)
  duration: number; // milliseconds
}

export interface RawMetrics {
  wpm: number;
  duration_seconds: number;
  word_count: number;
  filler_counts: Record<string, number>;
  total_filler_count: number;
  filler_density: number;         // fillers per minute
  pauses: DetectedPause[];
  pause_count: number;
  avg_pause_duration_ms: number;
  pause_mastery_score: number;    // 0-100, filled after speaker fetch
  vocab_depth_score: number;      // 0-100
  unique_word_ratio: number;
}

export interface AIAnalysis {
  overall_score: number;
  clarity_score: number;
  energy_variance_score: number;
  feedback_summary: string;
  improvement_tips: string[];
  strongest_trait: string;
  speaker_match_reasoning: string;
}

// ---------------------------------------------------------------------------
// Category analysis types
// ---------------------------------------------------------------------------

export interface AnalysisDimension {
  key: string;
  label: string;
  description: string;
  scale: [number, number]; // e.g. [0, 100]
}

export interface AnalysisLens {
  ai_focus_prompt: string;
  dimensions: AnalysisDimension[];
}

export interface SpeakerCategoryRow {
  id: string;
  name: string;
  analysis_lens: AnalysisLens;
  primary_metrics_this_mentor_cares_about?: unknown;
}

// ---------------------------------------------------------------------------
// Style match types
// ---------------------------------------------------------------------------

export interface StyleMatchBreakdown {
  vector_similarity: number | null; // 0-100; null if no mentor embeddings
  vocabulary_match: number;         // 0-100
  energy_match: number;             // 0-100
  structure_match: number;          // 0-100
  signature_adoption: number;       // raw count of exact phrase matches
}

export interface StyleMatchResult {
  overall_score: number | null;    // weighted average 0-100; null if no embeddings
  breakdown: StyleMatchBreakdown;
  signature_phrases_used: string[];
}

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface RecordingRow {
  id: string;
  user_id: string;
  audio_url: string;
  status: string;
  drill_id: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  topic: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SpeakerRow {
  id: string;
  name: string;
  specialty: string;
  signature_trait: string;
  ideal_wpm_min: number;
  ideal_wpm_max: number;
  pause_frequency: "low" | "medium" | "high";
  energy_profile: string;
  sort_order: number;
}

// Extended speaker row returned when joined with speaker_categories
export interface SpeakerWithCategory extends SpeakerRow {
  category_id: string | null;
  signature_phrases: string[];
  persuasion_techniques: string[];
  style_traits: string[];
  speaker_categories: SpeakerCategoryRow | null;
  persona_profile: unknown;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  current_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
  selected_speaker_id: string | null;
}

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
}

export interface DrillRow {
  id: string;
  xp: number;
}

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

export interface AnalysisResponse extends AIAnalysis {
  id: string;
  recording_id: string;
  user_id: string;
  target_speaker_id: string;
  xp_awarded: number;
  wpm: number;
  filler_counts: Record<string, number>;
  total_filler_count: number;
  filler_density: number;
  pause_count: number;
  avg_pause_duration_ms: number;
  pause_mastery_score: number;
  vocab_depth_score: number;
  category_metrics: Record<string, unknown> | null;
  style_match_score: number | null;
  style_match_breakdown: StyleMatchBreakdown | null;
  mentor_alternative_phrasing: string | null;
  signature_phrases_used: string[];
  created_at: string;
  raw_metrics: RawMetrics;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}
