import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { Drill, DrillFilter, DrillWithCompletion } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// useDrills
// ---------------------------------------------------------------------------

/**
 * Returns all drills joined with the current user's most-recent completion
 * for each drill (if any). RLS ensures completions are always scoped to the
 * calling user — no extra user_id filter needed on the nested select.
 *
 * Optional filters:
 *  - category  : exact match on drill.category
 *  - difficulty: exact match on drill.difficulty
 *  - completedOnly: client-side filter — keeps only drills the user has
 *                   completed at least once (avoids a separate query)
 */
export function useDrills(filter?: DrillFilter) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<DrillWithCompletion[]>({
    queryKey: qk.drills(filter),
    queryFn: async () => {
      let query = supabase
        .from('drills')
        .select(`
          *,
          user_drill_completions(id, score, xp_earned, completed_at)
        `)
        .order('category')
        .order('sort_order', { ascending: true })

      if (filter?.category) {
        query = query.eq('category', filter.category)
      }
      if (filter?.difficulty !== undefined) {
        query = query.eq('difficulty', filter.difficulty)
      }

      const { data, error } = await query
      if (error) throw error

      const rows = (data ?? []) as DrillWithCompletion[]

      if (filter?.completedOnly) {
        return rows.filter((d) => d.user_drill_completions.length > 0)
      }

      return rows
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

// ---------------------------------------------------------------------------
// useDrill
// ---------------------------------------------------------------------------

/**
 * Fetches a single drill and the user's most-recent completion (if any).
 */
export function useDrill(id: string | undefined) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<DrillWithCompletion>({
    queryKey: qk.drill(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drills')
        .select(`
          *,
          user_drill_completions(id, score, xp_earned, completed_at)
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as DrillWithCompletion
    },
    enabled: !!userId && !!id,
    staleTime: 1000 * 60 * 10,
  })
}

// ---------------------------------------------------------------------------
// useDailyDrill
// ---------------------------------------------------------------------------

/**
 * Returns the drill of the day — deterministically selected server-side via
 * the `get_daily_drill` RPC (day-of-year % total drill count, see SQL).
 * The result is stable for the entire calendar day.
 */
export function useDailyDrill() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<Drill>({
    queryKey: qk.dailyDrill(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_drill', {
        p_user_id: userId!,
      })

      if (error) throw error
      // RPC returns SETOF drills — PostgREST wraps it in an array
      const rows = data as Drill[]
      if (!rows?.length) throw new Error('No drills configured')
      return rows[0]
    },
    enabled: !!userId,
    // Stable until midnight — use tomorrow's midnight as staleTime
    staleTime: (() => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      return midnight.getTime() - now.getTime()
    })(),
  })
}
