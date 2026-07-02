import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export type ConversationType = 'sales' | 'meeting' | 'interviewee' | 'interviewer' | 'negotiation' | 'coaching'

export type ConversationStatus =
  | 'pending'
  | 'diarizing'
  | 'awaiting_speaker_selection'
  | 'analyzing'
  | 'complete'
  | 'failed'

export interface ConversationMetric {
  key: string
  label: string
  value: string
  description: string
  good?: boolean
  benchmark?: string
}

export interface RadarDataPoint {
  axis: string
  you: number
  top: number
  avg: number
  pastYou?: number
}

export interface KeyEvent {
  type: string
  timestamp: number
  label: string
  description?: string
}

export interface TranscriptLine {
  [key: string]: any
  speaker: 'you' | 'other'
  text: string
  start: number
  end: number
}

export interface ConversationResult {
  id: string
  recording_id: string
  user_id: string
  conversation_type: ConversationType
  status: ConversationStatus
  overall_score: number
  duration_seconds: number
  context_stakes: string | null
  context_goal: string | null
  context_other_party: string | null
  summary: string | null
  metrics: ConversationMetric[]
  radar_data: RadarDataPoint[]
  key_events: KeyEvent[]
  transcript: TranscriptLine[]
  coach_notes: string | null
  improvement_areas: string[]
  error_message: string | null
  created_at: string
  updated_at: string
}

// ---- helpers -----------------------------------------------------------

/** Backend uses "sales_call"; UI uses "sales". Normalise both ways. */
function fromBackendType(t: string | null | undefined): ConversationType {
  if (t === 'sales_call') return 'sales'
  return (t ?? 'meeting') as ConversationType
}

function metricLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function metricsFromJson(raw: any): ConversationMetric[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as ConversationMetric[]
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([key, value]) => ({
      key,
      label: metricLabel(key),
      value: typeof value === 'number' ? String(value) : String(value ?? '—'),
      description: '',
    }))
  }
  return []
}

function radarFromScorecard(raw: any): RadarDataPoint[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((p: any) => ({
      axis: p.axis ?? p.label ?? p.key ?? 'metric',
      you: Number(p.you ?? p.score ?? 0),
      top: Number(p.top ?? 90),
      avg: Number(p.avg ?? 60),
      pastYou: p.pastYou !== undefined ? Number(p.pastYou) : undefined,
    }))
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([axis, value]) => ({
      axis: metricLabel(axis),
      you: Number(value ?? 0),
      top: 90,
      avg: 60,
    }))
  }
  return []
}

function keyEventsFromJson(raw: any): KeyEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e: any) => ({
    type: e.type ?? 'moment',
    timestamp: Number(e.timestamp ?? e.time ?? 0),
    label: e.label ?? e.title ?? 'Moment',
    description: e.description ?? e.snippet ?? '',
  }))
}

function transcriptFromDiarization(diarization: any, userLabel: string | null): TranscriptLine[] {
  const utterances = diarization?.utterances
  if (!Array.isArray(utterances)) return []
  return utterances.map((u: any) => ({
    speaker: u.speaker_label === userLabel ? 'you' : 'other',
    text: u.text ?? '',
    start: Number(u.start ?? 0),
    end: Number(u.end ?? 0),
  }))
}

function tipsToAreas(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((t: any) => (typeof t === 'string' ? t : t?.title ?? t?.description ?? ''))
      .filter(Boolean)
  }
  return []
}

function coachNotesFromTips(raw: any): string | null {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw
      .map((t: any) =>
        typeof t === 'string' ? t : [t?.title, t?.description].filter(Boolean).join(' — '),
      )
      .filter(Boolean)
      .join('\n\n')
  }
  return null
}

interface ConversationRow {
  id: string
  user_id: string
  conversation_type: string
  status: ConversationStatus
  duration_seconds: number | null
  context_stakes: string | null
  context_goal: string | null
  context_other_party: string | null
  diarization_data: any
  user_speaker_label: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

interface AnalysisRow {
  id: string
  overall_score: number | null
  type_specific_metrics: any
  timeline_events: any
  moments_of_truth: any
  improvement_tips: any
  feedback_summary: string | null
  scorecard: any
}

function mapToResult(
  convo: ConversationRow,
  analysis: AnalysisRow | null,
): ConversationResult {
  return {
    id: convo.id,
    recording_id: convo.id,
    user_id: convo.user_id,
    conversation_type: fromBackendType(convo.conversation_type),
    status: convo.status,
    overall_score: analysis?.overall_score ?? 0,
    duration_seconds: Number(convo.duration_seconds ?? 0),
    context_stakes: convo.context_stakes,
    context_goal: convo.context_goal,
    context_other_party: convo.context_other_party,
    summary: analysis?.feedback_summary ?? null,
    metrics: metricsFromJson(analysis?.type_specific_metrics),
    radar_data: radarFromScorecard(analysis?.scorecard),
    key_events: keyEventsFromJson(analysis?.timeline_events),
    transcript: transcriptFromDiarization(convo.diarization_data, convo.user_speaker_label),
    coach_notes: coachNotesFromTips(analysis?.improvement_tips),
    improvement_areas: tipsToAreas(analysis?.moments_of_truth ?? analysis?.improvement_tips),
    error_message: convo.error_message,
    created_at: convo.created_at,
    updated_at: convo.updated_at,
  }
}

const ACTIVE_STATUSES: ConversationStatus[] = [
  'pending',
  'diarizing',
  'awaiting_speaker_selection',
  'analyzing',
]

// ---- hooks -------------------------------------------------------------

export function useConversationResult(conversationId: string) {
  return useQuery<ConversationResult | null>({
    queryKey: qk.conversationResult(conversationId),
    queryFn: async () => {
      const { data: convo, error: convoErr } = await supabase
        .from('conversations')
        .select(
          'id, user_id, conversation_type, status, duration_seconds, context_stakes, context_goal, context_other_party, diarization_data, user_speaker_label, error_message, created_at, updated_at',
        )
        .eq('id', conversationId)
        .maybeSingle()

      if (convoErr) throw convoErr
      if (!convo) return null

      const { data: analysis } = await supabase
        .from('conversation_analyses')
        .select(
          'id, overall_score, type_specific_metrics, timeline_events, moments_of_truth, improvement_tips, feedback_summary, scorecard',
        )
        .eq('conversation_id', conversationId)
        .maybeSingle()

      return mapToResult(convo as ConversationRow, (analysis as AnalysisRow | null) ?? null)
    },
    enabled: !!conversationId,
    // Poll while the conversation is still processing.
    refetchInterval: (query) => {
      const result = query.state.data as ConversationResult | null | undefined
      if (!result) return 3000
      return ACTIVE_STATUSES.includes(result.status) ? 3000 : false
    },
    staleTime: 0,
  })
}

export function useConversationResults(filters?: {
  type?: ConversationType
  limit?: number
}) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<ConversationResult[]>({
    queryKey: qk.conversationResults(userId!, filters),
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(
          'id, user_id, conversation_type, status, duration_seconds, context_stakes, context_goal, context_other_party, diarization_data, user_speaker_label, error_message, created_at, updated_at, conversation_analyses(id, overall_score, type_specific_metrics, timeline_events, moments_of_truth, improvement_tips, feedback_summary, scorecard)',
        )
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })

      if (filters?.type) {
        // UI type "sales" ↔ backend "sales_call"
        const backendType = filters.type === 'sales' ? 'sales_call' : filters.type
        query = query.in('conversation_type', [filters.type, backendType])
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []).map((row: any) => {
        const analyses = Array.isArray(row.conversation_analyses)
          ? row.conversation_analyses[0]
          : row.conversation_analyses
        return mapToResult(row as ConversationRow, (analyses as AnalysisRow | null) ?? null)
      })
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  })
}
