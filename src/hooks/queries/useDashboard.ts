import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { DashboardStats, ProgressChartPoint } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// useDashboardStats
// ---------------------------------------------------------------------------

/**
 * Aggregated stats for the dashboard summary cards.
 * Backed by the `get_dashboard_stats` Postgres RPC (see 002_rpc_functions.sql).
 *
 * Returns: total_sessions, total_minutes_spoken, average_score, best_score
 *          (+ date + recording_id), total_drills_completed, current_streak,
 *          longest_streak.
 *
 * Invalidation:
 *   Call after a recording is created/deleted, or an analysis is written:
 *   `queryClient.invalidateQueries({ queryKey: qk.dashboardStats(userId) })`
 */
export function useDashboardStats() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<DashboardStats>({
    queryKey: qk.dashboardStats(userId!),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: userId!,
      })

      if (error) throw error

      // RPC returns a single JSONB object — cast it
      return data as unknown as DashboardStats
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 min — stats can update after any session
  })
}

// ---------------------------------------------------------------------------
// useProgressChartData
// ---------------------------------------------------------------------------

/**
 * Returns {date, overall_score} pairs for the last `days` calendar days,
 * suitable for a recharts/nivo LineChart.
 *
 * Backed by the `get_progress_chart` Postgres RPC.
 * Dates with no recordings are omitted (sparse array — fill gaps in the chart
 * component if you need a continuous line).
 *
 * Invalidation:
 *   `queryClient.invalidateQueries({ queryKey: qk.progressChart(userId, days) })`
 */
export function useProgressChartData(days = 14) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<ProgressChartPoint[]>({
    queryKey: qk.progressChart(userId!, days),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_progress_chart', {
        p_user_id: userId!,
        p_days: days,
      })

      if (error) throw error

      return (data ?? []) as ProgressChartPoint[]
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}
