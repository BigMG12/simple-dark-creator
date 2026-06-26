import type { DrillFilter, SpeakerSource } from './database.types'

/**
 * Centralized query key factories.
 * Every useQuery / useMutation that touches the cache imports from here.
 * Keeping keys as typed tuples prevents string-drift bugs and makes
 * invalidateQueries({ queryKey: qk.recordings(uid) }) fully type-safe.
 */
export const qk = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  session: () => ['session'] as const,

  // ── Profile ───────────────────────────────────────────────────────────────
  profile: (userId: string) => ['profile', userId] as const,

  // ── Recordings ────────────────────────────────────────────────────────────
  recordings: (userId: string, limit: number) =>
    ['recordings', userId, limit] as const,
  recording: (id: string) => ['recording', id] as const,

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboardStats: (userId: string) => ['dashboardStats', userId] as const,
  progressChart: (userId: string, days: number) =>
    ['progressChart', userId, days] as const,

  // ── Speakers ──────────────────────────────────────────────────────────────
  speakers: (specialty?: string) => ['speakers', specialty ?? null] as const,
  speaker: (id: string) => ['speaker', id] as const,

  // ── Drills ────────────────────────────────────────────────────────────────
  drills: (filter?: DrillFilter) => ['drills', filter ?? null] as const,
  drill: (id: string) => ['drill', id] as const,
  dailyDrill: () => ['dailyDrill'] as const,

  // ── Badges ────────────────────────────────────────────────────────────────
  badges: (userId: string) => ['badges', userId] as const,

  // ── Achievements ──────────────────────────────────────────────────────────
  achievementsTimeline: (userId: string, limit: number) =>
    ['achievementsTimeline', userId, limit] as const,

  // ── v2: Speaker categories ─────────────────────────────────────────────
  speakerCategories: () => ['speakerCategories'] as const,
  speakersByCategory: (
    categoryId: string | null,
    source: SpeakerSource | 'all' | null,
    search: string | null,
  ) => ['speakersByCategory', categoryId, source, search] as const,
  myImportedSpeakers: (userId: string) => ['myImportedSpeakers', userId] as const,

  // ── v2: Import quota & jobs ────────────────────────────────────────────
  importQuota: (userId: string) => ['importQuota', userId] as const,
  channelImports: (userId: string) => ['channelImports', userId] as const,
  channelImport: (importId: string) => ['channelImport', importId] as const,

  // ── v2: Results (full analysis with style-match) ───────────────────────
  results: (recordingId: string) => ['results', recordingId] as const,

  // ── Conversation results ───────────────────────────────────────────────
  conversationResult: (recordingId: string) =>
    ['conversationResult', recordingId] as const,
  conversationResults: (
    userId: string,
    filters?: { type?: string; limit?: number },
  ) => ['conversationResults', userId, filters ?? null] as const,

  // ── Conversations (legacy alias) ───────────────────────────────────────
  conversations: (userId: string, filters?: unknown) =>
    ['conversations', userId, filters ?? null] as const,
  conversation: (id: string) => ['conversation', id] as const,

  // ── Goals ──────────────────────────────────────────────────────────────
  goals: () => ['goals'] as const,
  goal: (id: string) => ['goal', id] as const,

  // ── Activity heatmap ───────────────────────────────────────────────────
  activityHeatmap: (userId: string, days: number) =>
    ['activityHeatmap', userId, days] as const,

  // ── Skill metrics & history ────────────────────────────────────────────
  skillMetrics: (userId: string) => ['skillMetrics', userId] as const,
  skillMetricsHistory: (userId: string, days: number) =>
    ['skillMetricsHistory', userId, days] as const,

  // ── Personal records & weekly reviews ──────────────────────────────────
  personalRecords: (userId: string) => ['personalRecords', userId] as const,
  weeklyReviews: (userId: string, limit?: number) =>
    ['weeklyReviews', userId, limit ?? null] as const,
} as const
