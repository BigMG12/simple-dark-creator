import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import { isSchemaError } from '@/lib/analysisErrors'
import type { SpeakerV2 } from '@/lib/database.types'

/**
 * Returns speakers the current user has imported (source = 'imported',
 * source_user_id = current user's id), ordered by creation date desc.
 *
 * Refreshes every 30 s so newly-completed import jobs surface quickly.
 * The realtime hook (useChannelImportRealtime) also invalidates this on
 * import completion, so the 30 s is just a safety net.
 */
export function useMyImportedSpeakers() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<SpeakerV2[]>({
    queryKey: qk.myImportedSpeakers(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('source', 'imported')
        .eq('source_user_id', userId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as SpeakerV2[]
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
    // If the DB is missing the `source` column, retrying or polling will
    // never succeed — bail out until the migration is applied.
    retry: (failureCount, error) => !isSchemaError(error) && failureCount < 2,
    refetchInterval: (query) =>
      isSchemaError(query.state.error) ? false : 30_000,
  })
}

/*
Usage:
  const { data: mySpeakers = [], isLoading } = useMyImportedSpeakers()
  // Shows all speakers the current user has imported from YouTube channels
*/
