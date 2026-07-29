import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { useSession } from './useAuth';

export interface UserGoal {
  id: string;
  user_id: string;
  title: string;
  metric_key: string;
  target_value: number;
  start_value: number;
  deadline: string;
  status: 'active' | 'completed' | 'abandoned';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all goals for the current user. Returns [] on error so the Progress
 * page keeps rendering even when the user_goals table doesn't exist yet.
 */
export function useGoals() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery<UserGoal[]>({
    queryKey: qk.goals(),
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from('user_goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as UserGoal[];
      } catch (err) {
        console.warn('[goals] fetch failed — table may be missing', err);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export interface CreateGoalInput {
  title: string;
  metric_key: string;
  target_value: number;
  start_value?: number;
  deadline: string;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('user_goals')
        .insert({
          user_id: userId,
          title: input.title,
          metric_key: input.metric_key,
          target_value: input.target_value,
          start_value: input.start_value ?? 0,
          deadline: input.deadline,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return data as UserGoal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals() }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserGoal> }) => {
      const { data, error } = await (supabase as any)
        .from('user_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as UserGoal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals() }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('user_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals() }),
  });
}
