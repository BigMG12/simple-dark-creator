import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import type { Session } from '@supabase/supabase-js'

/**
 * Returns the current Supabase session and keeps it in sync with auth state
 * changes. Safely no-ops when Supabase is not configured.
 */
export function useSession() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!hasSupabaseConfig) return
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData<Session | null>(qk.session(), session)
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

  return useQuery<Session | null>({
    queryKey: qk.session(),
    queryFn: async () => {
      if (!hasSupabaseConfig) return null
      try {
        const { data } = await supabase.auth.getSession()
        return data.session
      } catch {
        return null
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
