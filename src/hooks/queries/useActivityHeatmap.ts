import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export interface ActivityLog {
  id: string
  user_id: string
  activity_date: string
  sessions_count: number
  total_minutes: number
  total_xp_earned: number
  drills_completed: number
  intensity_level: number
  created_at: string
  updated_at: string
}

export interface HeatmapData {
  [key: string]: any;
  date: string
  count: number
  level: number
}

/**
 * Formatuje dane aktywności na format używany przez heatmapę
 */
function formatActivityForHeatmap(activities: ActivityLog[]): HeatmapData[] {
  return activities.map((activity) => ({
    date: activity.activity_date,
    count: activity.sessions_count,
    level: activity.intensity_level,
  }))
}

/**
 * Pobiera dane aktywności użytkownika dla heatmapy
 * @param days Liczba dni wstecz do pobrania (domyślnie 365)
 */
export function useActivityHeatmap(days: number = 365) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<HeatmapData[]>({
    queryKey: qk.activityHeatmap(userId!, days),
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId!)
        .gte('activity_date', startDate.toISOString().split('T')[0])
        .order('activity_date', { ascending: true })

      if (error) throw error

      return formatActivityForHeatmap(data || [])
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 min
  })
}
