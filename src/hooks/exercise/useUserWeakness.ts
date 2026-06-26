import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { WeaknessType } from '@/lib/exerciseTypes';

export function useUserWeakness() {
  return useQuery({
    queryKey: ['user-weakness'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return 'general' as WeaknessType;
      }

      const { data, error } = await supabase
        .rpc('detect_user_weakness', { p_user_id: user.id });

      if (error) {
        console.warn('Weakness detection failed, defaulting to general', error);
        return 'general' as WeaknessType;
      }

      return (data || 'general') as WeaknessType;
    },
    staleTime: 5 * 60 * 1000,
  });
}
