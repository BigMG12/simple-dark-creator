import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TrainingSession } from '@/lib/exerciseTypes';

export function useSessionProgress(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['training-session', sessionId],
    queryFn: async () => {
      if (!sessionId || sessionId.startsWith('mock-')) {
        return null;
      }

      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as unknown as TrainingSession;
    },
    enabled: !!sessionId,
  });
}
