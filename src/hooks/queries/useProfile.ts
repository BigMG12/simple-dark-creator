import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { getLevelProgress, getXPToNextLevel } from '@/lib/gamification'
import { useSession } from './useAuth'
import type { Profile, UpdateProfileInput } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Derived type
// ---------------------------------------------------------------------------

export interface ProfileWithProgress extends Profile {
  [key: string]: any;
  /** XP still needed to reach the next level. */
  xp_to_next_level: number
  /** 0–100 completion percentage within the current level band. */
  progress_percent_to_next_level: number
}

// ---------------------------------------------------------------------------
// useProfile
// ---------------------------------------------------------------------------

/**
 * Fetches the current user's profile row and appends derived level-progress
 * fields computed via the shared gamification library.
 */
export function useProfile() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<ProfileWithProgress>({
    queryKey: qk.profile(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single()

      if (error) throw error

      const levelProgress = getLevelProgress(data.current_xp)
      const xpToNext = getXPToNextLevel(data.current_xp)

      return {
        ...data,
        xp_to_next_level: xpToNext,
        progress_percent_to_next_level: levelProgress.progressPercent,
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 min — XP/level rarely changes mid-session
  })
}

// ---------------------------------------------------------------------------
// useUpdateProfile
// ---------------------------------------------------------------------------

/**
 * Mutation for updating the current user's editable profile fields.
 * On success, invalidates `profile`, `dashboardStats`, and `progressChart`
 * since a speaker change can affect derived dashboard data.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id

  return useMutation<Profile, Error, UpdateProfileInput>({
    mutationFn: async (payload) => {
      if (!userId) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      if (!userId) return
      queryClient.invalidateQueries({ queryKey: qk.profile(userId) })
      queryClient.invalidateQueries({ queryKey: qk.dashboardStats(userId) })
      queryClient.invalidateQueries({ queryKey: qk.speakers() })
    },
  })
}
