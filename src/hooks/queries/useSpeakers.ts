import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type { Speaker } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// useSpeakers
// ---------------------------------------------------------------------------

/**
 * Returns all speakers ordered by `sort_order`, with an optional `specialty`
 * filter (exact match on the specialty column).
 *
 * Speakers are public read-only data — very long staleTime is intentional.
 */
export function useSpeakers(specialty?: string) {
  const { data: session } = useSession()
  const isAuthed = !!session?.user.id

  return useQuery<Speaker[]>({
    queryKey: qk.speakers(specialty),
    queryFn: async () => {
      let query = supabase
        .from('speakers')
        .select('*')
        .order('sort_order', { ascending: true })

      if (specialty) {
        query = query.eq('specialty', specialty)
      }

      const { data, error } = await query
      if (error) throw error
      // Safety net: dedupe by *normalized* name in case the DB still has
      // duplicate seed rows (older migrations could insert the same mentor
      // twice with different casing / trailing whitespace). Prefer curated
      // / built_in rows, then the lowest sort_order.
      const norm = (s: string) => s.trim().toLowerCase()
      const rank = (s: Speaker) => {
        const src = (s as unknown as { source_type?: string }).source_type
        return src === 'built_in' || src === 'curated' ? 0 : 1
      }
      const seen = new Map<string, Speaker>()
      for (const s of data ?? []) {
        const key = norm(s.name)
        const existing = seen.get(key)
        if (!existing) {
          seen.set(key, s)
          continue
        }
        const rA = rank(existing)
        const rB = rank(s)
        if (rB < rA) {
          seen.set(key, s)
          continue
        }
        if (rB > rA) continue
        const a = existing.sort_order ?? Number.MAX_SAFE_INTEGER
        const b = s.sort_order ?? Number.MAX_SAFE_INTEGER
        if (b < a) seen.set(key, s)
      }
      return Array.from(seen.values()).sort(
        (a, b) =>
          (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
          (b.sort_order ?? Number.MAX_SAFE_INTEGER),
      )
    },
    enabled: isAuthed,
    staleTime: 1000 * 60 * 60, // 1 h — speakers change very rarely
  })
}

// ---------------------------------------------------------------------------
// useSpeaker
// ---------------------------------------------------------------------------

/**
 * Fetches full details for a single speaker by id.
 * Useful on the speaker detail / coach profile page.
 */
export function useSpeaker(id: string | undefined) {
  const { data: session } = useSession()
  const isAuthed = !!session?.user.id

  return useQuery<Speaker>({
    queryKey: qk.speaker(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data
    },
    enabled: isAuthed && !!id,
    staleTime: 1000 * 60 * 60,
  })
}
