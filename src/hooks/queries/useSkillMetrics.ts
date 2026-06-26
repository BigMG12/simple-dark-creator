import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export interface SkillMetric {
  id: string
  user_id: string
  recorded_at: string
  clarity: number
  confidence: number
  engagement: number
  pacing: number
  articulation: number
  vocabulary: number
  recording_id: string | null
  created_at: string
}

export interface SkillRadarData {
  [key: string]: any;
  skill: string
  current: number
  previous?: number
}

/**
 * Formatuje metryki umiejętności na format używany przez radar
 */
function formatSkillsForRadar(current: SkillMetric, previous?: SkillMetric): SkillRadarData[] {
  const skills = ['clarity', 'confidence', 'engagement', 'pacing', 'articulation', 'vocabulary'] as const
  const labels: Record<typeof skills[number], string> = {
    clarity: 'Klarowność',
    confidence: 'Pewność',
    engagement: 'Zaangażowanie',
    pacing: 'Tempo',
    articulation: 'Artykulacja',
    vocabulary: 'Słownictwo',
  }

  return skills.map((skill) => ({
    skill: labels[skill],
    current: Math.round(current[skill]),
    previous: previous ? Math.round(previous[skill]) : undefined,
  }))
}

/**
 * Pobiera najnowsze metryki umiejętności użytkownika dla radaru
 * Zwraca obecne i poprzednie metryki do porównania
 */
export function useSkillMetrics() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<any>({
    queryKey: qk.skillMetrics(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_metrics')
        .select('*')
        .eq('user_id', userId!)
        .order('recorded_at', { ascending: false })
        .limit(2)

      if (error) throw error

      if (!data || data.length === 0) {
        return []
      }

      const current = data[0]
      const previous = data.length > 1 ? data[1] : undefined

      return formatSkillsForRadar(current, previous)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Pobiera historię metryk umiejętności dla wykresu trendów
 */
export function useSkillMetricsHistory(days: number = 30) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<SkillMetric[]>({
    queryKey: qk.skillMetricsHistory(userId!, days),
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('skill_metrics')
        .select('*')
        .eq('user_id', userId!)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })
}
