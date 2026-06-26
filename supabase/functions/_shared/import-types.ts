/**
 * _shared/import-types.ts
 * TypeScript types for the BIG SPEAKING speaker import pipeline.
 * Used by: create-speaker-import-job, run-import-orchestrator,
 *          process-transcripts, generate-speaker-persona, embed-speech-samples
 */

// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

export type SourceType =
  | "youtube_channel"
  | "youtube_video"
  | "rumble"
  | "spotify"
  | "upload";

export type ImportStatus =
  | "queued"
  | "fetching_metadata"
  | "fetching_transcripts"
  | "transcribing_audio"   // Whisper API pass in progress (added in 006_import_reliability.sql)
  | "analyzing_style"
  | "generating_persona"
  | "embedding"
  | "complete"
  | "failed"
  | "cancelled";           // user explicitly stopped the import

export type TranscriptMethod =
  | "youtube_captions"
  | "whisper_api"
  | "spotify_transcript";

export type TranscriptJobStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "failed"
  | "skipped";  // parent import was cancelled before this job started

export type CategoryId =
  | "motivation"
  | "sales"
  | "influence"
  | "leadership"
  | "storytelling"
  | "authority";

export type PauseFrequency = "high" | "medium" | "low";

// ---------------------------------------------------------------------------
// Database row shapes (match 005_speaker_imports.sql exactly)
// ---------------------------------------------------------------------------

export interface ChannelImport {
  id: string;
  user_id: string;
  source_type: SourceType;
  source_url: string;
  status: ImportStatus;
  progress_current: number;
  progress_total: number;
  source_metadata: Record<string, unknown> | null;
  resulting_speaker_id: string | null;
  error_message: string | null;
  custom_name: string | null;
  custom_trait: string | null;
  target_category_id: CategoryId | null;
  // Added in 006_import_reliability.sql
  retry_count: number;
  updated_at: string;
  created_at: string;
  completed_at: string | null;
}

export interface TranscriptJob {
  id: string;
  import_id: string;
  source_url: string;
  storage_path: string | null;
  transcript_method: TranscriptMethod;
  status: TranscriptJobStatus;
  transcript_text: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  video_id: string | null;
  title: string | null;
  // Added in 006_import_reliability.sql
  updated_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// AI-generated persona (matches the GPT-4o system prompt schema)
// ---------------------------------------------------------------------------

export interface PersonaProfile {
  name: string;
  monogram: string;
  specialty: string;
  category_suggestion: CategoryId;
  signature_trait: string;
  bio: string;
  ideal_wpm_min: number;
  ideal_wpm_max: number;
  ideal_pause_frequency: PauseFrequency;
  energy_profile: string;
  signature_phrases: string[];
  common_themes: string[];
  persuasion_techniques: string[];
  style_traits: string[];
  perfect_for: string;
  famous_speeches: unknown[];
  learnings: string[];
}

// ---------------------------------------------------------------------------
// Platform-specific metadata shapes (stored in source_metadata JSONB)
// ---------------------------------------------------------------------------

export interface YouTubeChannelMeta {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  subscriberCount: string | null;
}

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  durationSeconds: number;
  isLiveStream: boolean;
  isShort: boolean;
  hasCaption: boolean;
}

export interface SpotifyShowMeta {
  id: string;
  name: string;
  description: string;
  publisher: string;
  totalEpisodes: number;
}

export interface SpotifyEpisodeInfo {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  releaseDate: string;
}

export interface RumbleVideoInfo {
  videoId: string;
  title: string;
  durationSeconds: number;
}

// ---------------------------------------------------------------------------
// HTTP request / response shapes
// ---------------------------------------------------------------------------

export interface CreateImportJobRequest {
  source_type: SourceType;
  source_url: string;
  num_videos?: number;
  target_category_id?: CategoryId;
  custom_name?: string;
  custom_trait?: string;
}

export interface CreateImportJobResponse {
  import_id: string;
  estimated_completion_minutes: number;
}

export interface OrchestratorRequest {
  import_id: string;
}

export interface ProcessTranscriptsRequest {
  import_id: string;
}

export interface GeneratePersonaRequest {
  import_id: string;
}

export interface EmbedSamplesRequest {
  speaker_id: string;
  import_id: string;
}

// ---------------------------------------------------------------------------
// URL validation regexes
// ---------------------------------------------------------------------------

export const URL_PATTERNS: Record<SourceType, RegExp | null> = {
  youtube_channel:
    /^https?:\/\/(www\.)?youtube\.com\/(@[\w.-]+|channel\/UC[\w-]{22})(\/.*)?$/,
  youtube_video:
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}|https?:\/\/youtu\.be\/[\w-]{11}/,
  rumble: /^https?:\/\/(www\.)?rumble\.com\/.+/,
  spotify:
    /^https?:\/\/open\.spotify\.com\/show\/[A-Za-z0-9]+/,
  upload: null, // uploads don't have a public URL at request time
};

// ---------------------------------------------------------------------------
// Estimated completion times (minutes) by source type
// ---------------------------------------------------------------------------

export function estimateCompletionMinutes(
  sourceType: SourceType,
  numItems: number,
): number {
  switch (sourceType) {
    case "youtube_channel":
      // ~45 seconds per video for caption fetch + analysis
      return Math.max(5, Math.ceil(numItems * 0.75));
    case "youtube_video":
      return 3;
    case "rumble":
      return Math.max(5, Math.ceil(numItems * 1.5));
    case "spotify":
      // Spotify episodes often need Whisper (slower)
      return Math.max(8, Math.ceil(numItems * 2));
    case "upload":
      return 10;
  }
}
