import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { SpeakerV2, SpeakerSource } from '@/lib/database.types'

export interface SpeakersByCategoryOptions {
  source?: SpeakerSource | 'all'
  search?: string
}

/**
 * Fetches speakers filtered by category and/or source, with optional full-text search.
 *
 * - categoryId: undefined → returns all categories
 * - source: 'all' | undefined → no source filter applied
 * - search: filters on speaker name (ilike)
 *
 * staleTime is set to 5 min — imported speakers can appear after a job completes,
 * so we don't cache forever like curated speakers.
 */
export function useSpeakersByCategory(
  categoryId?: string,
  options: SpeakersByCategoryOptions = {},
) {
  const { data: session } = useSession()
  const userId = session?.user.id
  const { source, search } = options

  const normalizedCategoryId = categoryId ?? null
  const normalizedSource = (!source || source === 'all') ? null : source
  const normalizedSearch = search?.trim() || null

  return useQuery<SpeakerV2[]>({
    queryKey: qk.speakersByCategory(normalizedCategoryId, normalizedSource, normalizedSearch),
    queryFn: async () => {
      let query = supabase
        .from('speakers')
        .select('*')
        .order('sort_order', { ascending: true })

      if (normalizedCategoryId) {
        query = query.eq('category_id', normalizedCategoryId)
      }
      if (normalizedSource) {
        query = query.eq('source', normalizedSource)
      }
      if (normalizedSearch) {
        query = query.ilike('name', `%${normalizedSearch}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as SpeakerV2[]
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 min — imported speakers may arrive after jobs complete
  })
}

/*
Usage:
  // All speakers in a category
  const { data: speakers } = useSpeakersByCategory('cat-leadership')

  // Only imported speakers matching a search
  const { data: results } = useSpeakersByCategory(undefined, {
    source: 'imported',
    search: 'Obama',
  })
*/
