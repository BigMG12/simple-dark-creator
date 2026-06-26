import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export interface WeeklyReview {
  id: string
  user_id: string
  week_of: string
  sessions_count: number
  avg_score: number | null
  minutes_spoken: number
  top_metric_label: string | null
  top_metric_value: string | null
  body: string[]
  recommended_drill_id: string | null
  generated_at: string
  created_at: string
}

export interface FormattedWeeklyReview {
  [key: string]: any;
  id: string
  weekOf: string
  snapshot: {
    sessions: number
    avgScore: number
    minutesSpoken: number
    topMetric: {
      label: string
      value: string
    }
  }
  body: string[]
  recommendedDrill: {
    id: string
  } | null
}

/**
 * Formatuje surowe recenzje z bazy na format używany w UI
 */
function formatReview(review: WeeklyReview): FormattedWeeklyReview {
  return {
    id: review.id,
    weekOf: review.week_of,
    snapshot: {
      sessions: review.sessions_count,
      avgScore: review.avg_score ? Math.round(review.avg_score) : 0,
      minutesSpoken: review.minutes_spoken,
      topMetric: {
        label: review.top_metric_label || 'Brak',
        value: review.top_metric_value || '-',
      },
    },
    body: review.body,
    recommendedDrill: review.recommended_drill_id
      ? { id: review.recommended_drill_id }
      : null,
  }
}

/**
 * Pobiera cotygodniowe recenzje użytkownika, posortowane według daty tygodnia (najnowsze pierwsze)
 */
export function useWeeklyReviews() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<FormattedWeeklyReview[]>({
    queryKey: qk.weeklyReviews(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', userId!)
        .order('week_of', { ascending: false })

      if (error) throw error

      return (data || []).map(formatReview)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 min
  })
}
