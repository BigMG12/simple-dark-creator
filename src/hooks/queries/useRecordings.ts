import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { RecordingWithAnalysis } from './useResults'

// ---------------------------------------------------------------------------
// useRecentRecordings
// ---------------------------------------------------------------------------

/**
 * Returns the current user's most recent recordings, each joined with its
 * analysis row (null when analysis hasn't completed yet).
 *
 * Invalidation strategy:
 *   After a new recording is created or an analysis completes, call:
 *   `queryClient.invalidateQueries({ queryKey: qk.recordings(userId, limit) })`
 *
 *   You can also do a broader invalidation by prefix:
 *   `queryClient.invalidateQueries({ queryKey: ['recordings', userId] })`
 */
export function useRecentRecordings(limit = 10) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<RecordingWithAnalysis[]>({
    queryKey: qk.recordings(userId!, limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          analysis:analyses(*)
        `)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data ?? []).map((row) => ({
        ...row,
        // PostgREST returns the joined row as an object (1:1) or null
        analysis: Array.isArray(row.analysis) ? row.analysis[0] ?? null : row.analysis,
      })) as RecordingWithAnalysis[]
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 s — recordings update when analysis completes
  })
}

// ---------------------------------------------------------------------------
// useRecording
// ---------------------------------------------------------------------------

/**
 * Fetches a single recording by id and its associated analysis.
 * Useful on the Results page where the recording id comes from the URL.
 */
export function useRecording(id: string | undefined) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<RecordingWithAnalysis>({
    queryKey: qk.recording(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          analysis:analyses(*)
        `)
        .eq('id', id!)
        .eq('user_id', userId!)
        .single()

      if (error) throw error

      return {
        ...data,
        analysis: Array.isArray(data.analysis)
          ? data.analysis[0] ?? null
          : data.analysis,
      } as RecordingWithAnalysis
    },
    enabled: !!userId && !!id,
    staleTime: 1000 * 60 * 10, // 10 min — individual result rarely changes
  })
}
