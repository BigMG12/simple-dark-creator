import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'

export interface Conversation {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string
  difficulty: string
  scenario: string
  context: string | null
  goals: string[]
  duration_minutes: number | null
  times_practiced: number
  last_practiced_at: string | null
  is_favorite: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export function useConversations(filters?: {
  category?: string
  difficulty?: string
  search?: string
}) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<Conversation[]>({
    queryKey: qk.conversations(userId!, filters),
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useConversation(conversationId: string) {
  return useQuery<Conversation>({
    queryKey: qk.conversation(conversationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (conversation: Omit<Conversation, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'times_practiced' | 'last_practiced_at'>) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          ...conversation,
          user_id: session!.user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.conversations(session!.user.id, {}) })
    },
  })
}

export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Conversation> }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.conversation(data.id) })
      queryClient.invalidateQueries({ queryKey: qk.conversations(data.user_id, {}) })
    },
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.conversations(session!.user.id, {}) })
    },
  })
}
