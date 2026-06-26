import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { SpeakerCategory } from '@/lib/database.types'

/**
 * Fetches all speaker_categories ordered by sort_order.
 *
 * Categories are reference data that almost never changes, so we use
 * staleTime: Infinity — they stay fresh until the app is reloaded.
 * Background refetch on window focus is disabled for the same reason.
 */
export function useSpeakerCategories() {
  const { data: session } = useSession()
  const isAuthed = !!session?.user.id

  return useQuery<SpeakerCategory[]>({
    queryKey: qk.speakerCategories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaker_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: isAuthed,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/*
Usage:
  const { data: categories = [] } = useSpeakerCategories()
  // [{ id: 'cat-1', name: 'Leadership', sort_order: 1, ... }, ...]
*/
