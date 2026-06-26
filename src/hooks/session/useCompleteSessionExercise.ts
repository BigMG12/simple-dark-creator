import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface CompleteParams {
  sessionId: string;
  recordingId: string;
  score: number;
}

export function useCompleteSessionExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, recordingId, score }: CompleteParams) => {
      const { data, error } = await supabase
        .rpc('complete_session_exercise', {
          p_session_id: sessionId,
          p_recording_id: recordingId,
          p_score: score,
        });

      if (error) throw error;
      return data as {
        session_id: string;
        completed_exercises: number;
        total_exercises: number;
        status: string;
        is_complete: boolean;
      };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['training-session', vars.sessionId],
      });
    },
  });
}
