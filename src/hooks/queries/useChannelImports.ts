import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { ChannelImport } from '@/lib/database.types'

/**
 * Fetches all channel_imports rows for the current user, newest first.
 *
 * Invalidation:
 *   - useCreateImportJob (on success)
 *   - useCancelImport (on success)
 *   - useChannelImportRealtime (on any realtime update)
 */
export function useChannelImports() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<ChannelImport[]>({
    queryKey: qk.channelImports(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_imports')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 s — actively-running imports change frequently
  })
}

/*
Usage:
  const { data: imports = [] } = useChannelImports()
  const activeImport = imports.find(i => i.status === 'processing')
*/
