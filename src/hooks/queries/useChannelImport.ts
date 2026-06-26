import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { ChannelImport } from '@/lib/database.types'

/**
 * Fetches a single channel_import by id with live progress data.
 *
 * staleTime is intentionally short (10 s) so progress bars stay accurate
 * even without realtime. useChannelImportRealtime complements this by
 * pushing updates immediately on change.
 */
export function useChannelImport(importId: string | undefined) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<ChannelImport>({
    queryKey: qk.channelImport(importId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_imports')
        .select('*')
        .eq('id', importId!)
        .eq('user_id', userId!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userId && !!importId,
    staleTime: 1000 * 10, // 10 s — progress can change rapidly during processing
    refetchInterval: (query) => {
      // Stop polling once the job reaches a terminal state
      const status = query.state.data?.status
      if (!status || status === 'complete' || status === 'cancelled' || status === 'failed') {
        return false
      }
      return 1000 * 15 // poll every 15 s while active
    },
  })
}

/*
Usage:
  const { data: job } = useChannelImport(importId)
  // job.progress → 0–100 integer
  // job.status   → 'pending' | 'processing' | 'complete' | 'cancelled' | 'failed'
*/
