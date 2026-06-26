import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { UserSpeakerImportsQuota } from '@/lib/database.types'

/**
 * Fetches the user_speaker_imports_quota row for the current user.
 *
 * Returns null when the row doesn't exist yet (before first import).
 * Consumers should treat null as { used_imports: 0, max_imports: defaultLimit }.
 *
 * Invalidated by useCreateImportJob and useDeleteImportedSpeaker mutations.
 */
export function useImportQuota() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<UserSpeakerImportsQuota | null>({
    queryKey: qk.importQuota(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_speaker_imports_quota')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()

      if (error) throw error
      return data ?? null
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 min
  })
}

/*
Usage:
  const { data: quota } = useImportQuota()
  const remaining = quota ? quota.max_imports - quota.used_imports : MAX_DEFAULT
*/
