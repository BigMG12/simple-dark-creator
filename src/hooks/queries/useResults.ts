import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import type { Recording, Analysis, Speaker } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordingWithAnalysis extends Recording {
  analysis: Analysis | null
  speaker: Speaker | null
}

// ---------------------------------------------------------------------------
// useResults
// ---------------------------------------------------------------------------

/**
 * Fetches a recording with its analysis and target speaker.
 * Used on the /results/:id page to display full analysis results.
 */
export function useResults(recordingId: string | undefined) {
  return useQuery<RecordingWithAnalysis | null>({
    queryKey: qk.results(recordingId!),
    queryFn: async () => {
      if (!recordingId) return null

      const { data: recording, error: recError } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recordingId)
        .single()

      if (recError) throw recError
      if (!recording) return null

      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('recording_id', recordingId)
        .maybeSingle()

      if (analysisError) throw analysisError

      let speaker = null
      if (analysis?.compared_to_speaker_id) {
        const { data: speakerData } = await supabase
          .from('speakers')
          .select('*')
          .eq('id', analysis.compared_to_speaker_id)
          .single()

        speaker = speakerData
      }

      return {
        ...recording,
        analysis,
        speaker,
      }
    },
    enabled: !!recordingId,
    staleTime: Infinity,
  })
}
