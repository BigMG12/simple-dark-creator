import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function useStartAdaptiveSession() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('build_adaptive_session');

      if (error) {
        console.warn('RPC build_adaptive_session failed, using fallback', error);
        return {
          session_id: 'mock-' + Date.now(),
          weakness_focus: 'general' as const,
          exercise_count: 3,
          sequence: [
            { order: 1, type: 'drill' as const, drill_id: null, reason: 'Warmup' },
            { order: 2, type: 'impromptu' as const, duration_seconds: 60, reason: 'Apply' },
            { order: 3, type: 'drill' as const, drill_id: null, reason: 'Challenge' },
          ],
        };
      }

      return data as {
        session_id: string;
        weakness_focus: string;
        exercise_count: number;
        sequence: Array<{
          order: number;
          type: string;
          drill_id?: string | null;
          duration_seconds?: number;
          reason: string;
        }>;
      };
    },
    onSuccess: (data) => {
      navigate(`/exercise/session/${data.session_id}`);
    },
  });
}
