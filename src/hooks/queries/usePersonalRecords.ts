import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export interface PersonalRecord {
  id: string
  user_id: string
  record_type: string
  record_value: number
  achieved_at: string
  recording_id: string | null
  conversation_id: string | null
  speaker_id: string | null
}

export interface FormattedRecord {
  [key: string]: any;
  type: string
  label: string
  value: string | number
  unit?: string
  date: string
  context?: string
  feedbackSnippet?: string
  recordingId?: string
}

/**
 * Formatuje surowe rekordy z bazy na format używany w UI
 */
function formatRecord(record: PersonalRecord): FormattedRecord {
  const recordTypeLabels: Record<string, string> = {
    best_score: 'Najlepszy wynik',
    longest_session: 'Najdłuższa sesja',
    most_sessions_week: 'Najwięcej sesji w tygodniu',
    highest_clarity: 'Najwyższa klarowność',
    highest_confidence: 'Najwyższa pewność',
    highest_engagement: 'Najwyższe zaangażowanie',
    total_sessions: 'Łączna liczba sesji',
    total_minutes: 'Łączny czas praktyki',
  }

  const label = recordTypeLabels[record.record_type] || record.record_type
  let value: string | number = record.record_value
  let unit: string | undefined

  // Formatowanie wartości w zależności od typu rekordu
  if (record.record_type === 'longest_session') {
    value = Math.round(record.record_value)
    unit = 'min'
  } else if (record.record_type === 'total_minutes') {
    value = Math.round(record.record_value)
    unit = 'min'
  } else if (record.record_type.includes('score') || record.record_type.includes('clarity') ||
             record.record_type.includes('confidence') || record.record_type.includes('engagement')) {
    value = Math.round(record.record_value)
  }

  return {
    type: record.record_type,
    label,
    value,
    unit,
    date: record.achieved_at,
    recordingId: record.recording_id || undefined,
  }
}

/**
 * Pobiera rekordy osobiste użytkownika, posortowane według daty osiągnięcia (najnowsze pierwsze)
 */
export function usePersonalRecords() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<FormattedRecord[]>({
    queryKey: qk.personalRecords(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', userId!)
        .order('achieved_at', { ascending: false })

      if (error) throw error

      return (data || []).map(formatRecord)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 min
  })
}
