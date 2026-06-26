import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export type ConversationType = 'sales' | 'meeting' | 'interviewee' | 'interviewer' | 'negotiation' | 'coaching'

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
  [key: string]: any;
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
  created_at: string
  updated_at: string
}

export function useConversationResult(recordingId: string) {
  return useQuery<ConversationResult>({
    queryKey: qk.conversationResult(recordingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_results')
        .select('*')
        .eq('recording_id', recordingId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!recordingId,
    staleTime: 1000 * 60 * 5,
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
        .from('conversation_results')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })

      if (filters?.type) {
        query = query.eq('conversation_type', filters.type)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateConversationResult() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (result: Omit<ConversationResult, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('conversation_results')
        .insert({
          ...result,
          user_id: session!.user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.conversationResult(data.recording_id) })
      queryClient.invalidateQueries({ queryKey: qk.conversationResults(session!.user.id, {}) })
    },
  })
}

export function useUpdateConversationResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ recordingId, updates }: { recordingId: string; updates: Partial<ConversationResult> }) => {
      const { data, error } = await supabase
        .from('conversation_results')
        .update(updates)
        .eq('recording_id', recordingId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.conversationResult(data.recording_id) })
      queryClient.invalidateQueries({ queryKey: qk.conversationResults(data.user_id, {}) })
    },
  })
}
