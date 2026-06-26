import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { BadgeWithStatus } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// useBadges
// ---------------------------------------------------------------------------

/**
 * Returns every badge in the catalogue merged with the current user's earned
 * status. The join is done client-side in a single round-trip by fetching
 * both tables in parallel and merging on badge_id.
 *
 * Result is sorted by sort_order; earned badges come first within that order.
 *
 * Invalidation:
 *   After a new badge is awarded call:
 *   `queryClient.invalidateQueries({ queryKey: qk.badges(userId) })`
 */
export function useBadges() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<BadgeWithStatus[]>({
    queryKey: qk.badges(userId!),
    queryFn: async () => {
      const [badgesRes, userBadgesRes] = await Promise.all([
        supabase.from('badges').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('user_badges')
          .select('badge_id, earned_at')
          .eq('user_id', userId!),
      ])

      if (badgesRes.error) throw badgesRes.error
      if (userBadgesRes.error) throw userBadgesRes.error

      const earnedMap = new Map(
        (userBadgesRes.data ?? []).map((ub) => [ub.badge_id, ub.earned_at]),
      )

      return (badgesRes.data ?? []).map((badge) => ({
        ...badge,
        earned: earnedMap.has(badge.id),
        earned_at: earnedMap.get(badge.id) ?? null,
      }))
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}
