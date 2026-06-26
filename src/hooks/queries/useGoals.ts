import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'

// NOTE: user_goals / goal_progress tables are not yet in the generated
// Database types. Use `any` shims so legacy consumers compile until the
// schema is regenerated.
type UserGoal = any
type UserGoalInsert = any
type UserGoalUpdate = any
type GoalProgress = any

export interface GoalWithProgress extends UserGoal {
  progress: GoalProgress[]
  currentValue: number
  progressPercent: number
}

/**
 * Pobiera wszystkie cele użytkownika z ich postępem
 */
export function useGoals() {
  return useQuery<GoalWithProgress[]>({
    queryKey: qk.goals(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: goals, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!goals) return []

      const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
          const { data: progress } = await supabase
            .from('goal_progress')
            .select('*')
            .eq('goal_id', goal.id)
            .order('recorded_at', { ascending: true })

          const progressData = progress || []
          const currentValue = progressData.length > 0
            ? progressData[progressData.length - 1].value
            : goal.starting_value || 0

          const range = goal.target_value - (goal.starting_value || 0)
          const achieved = currentValue - (goal.starting_value || 0)
          const progressPercent = range > 0 ? Math.min(100, Math.max(0, (achieved / range) * 100)) : 0

          return {
            ...goal,
            progress: progressData,
            currentValue,
            progressPercent: Math.round(progressPercent)
          }
        })
      )

      return goalsWithProgress
    },
    staleTime: 30000,
  })
}

/**
 * Pobiera pojedynczy cel z pełnym postępem
 */
export function useGoal(goalId: string | undefined) {
  return useQuery<GoalWithProgress | null>({
    queryKey: qk.goal(goalId!),
    queryFn: async () => {
      if (!goalId) return null

      const { data: goal, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (error) throw error
      if (!goal) return null

      const { data: progress } = await supabase
        .from('goal_progress')
        .select('*')
        .eq('goal_id', goal.id)
        .order('recorded_at', { ascending: true })

      const progressData = progress || []
      const currentValue = progressData.length > 0
        ? progressData[progressData.length - 1].value
        : goal.starting_value || 0

      const range = goal.target_value - (goal.starting_value || 0)
      const achieved = currentValue - (goal.starting_value || 0)
      const progressPercent = range > 0 ? Math.min(100, Math.max(0, (achieved / range) * 100)) : 0

      return {
        ...goal,
        progress: progressData,
        currentValue,
        progressPercent: Math.round(progressPercent)
      }
    },
    enabled: !!goalId,
    staleTime: 30000,
  })
}

/**
 * Tworzy nowy cel
 */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goal: UserGoalInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.goals() })
    },
  })
}

/**
 * Aktualizuje cel
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UserGoalUpdate }) => {
      const { data, error } = await supabase
        .from('user_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.goals() })
      queryClient.invalidateQueries({ queryKey: qk.goal(variables.id) })
    },
  })
}

/**
 * Usuwa cel
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.goals() })
    },
  })
}

/**
 * Dodaje punkt postępu do celu
 */
export function useAddGoalProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, value, recordedAt }: {
      goalId: string
      value: number
      recordedAt?: string
    }) => {
      const { data, error } = await supabase
        .from('goal_progress')
        .insert({
          goal_id: goalId,
          value,
          recorded_at: recordedAt || new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.goals() })
      queryClient.invalidateQueries({ queryKey: qk.goal(variables.goalId) })
    },
  })
}
