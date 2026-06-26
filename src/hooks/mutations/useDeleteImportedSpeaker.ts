import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from '@/hooks/queries/useAuth'

/**
 * Deletes an imported speaker row.
 *
 * DB cascade behaviour (enforced by the migration):
 *   - speaker_embeddings rows are CASCADE deleted
 *   - analyses rows that referenced this speaker have compared_to_speaker_id
 *     SET NULL — the user's recordings and results are preserved
 *
 * This mutation is intentionally restricted to imported speakers; attempting
 * to delete a curated speaker will be rejected by RLS on the backend.
 *
 * Invalidation:
 *   - myImportedSpeakers (list page)
 *   - speakersByCategory (browsing grid)
 *   - importQuota (used_imports decrements)
 */
export function useDeleteImportedSpeaker() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id

  return useMutation<void, Error, string>({
    mutationFn: async (speakerId: string) => {
      const { error } = await supabase
        .from('speakers')
        .delete()
        .eq('id', speakerId)
        .eq('source', 'imported')
        .eq('source_user_id', userId!)

      if (error) throw error
    },
    onSuccess: () => {
      if (!userId) return
      queryClient.invalidateQueries({ queryKey: qk.myImportedSpeakers(userId) })
      queryClient.invalidateQueries({ queryKey: ['speakersByCategory'] })
      queryClient.invalidateQueries({ queryKey: qk.importQuota(userId) })
      toast.success('Speaker deleted.')
    },
    onError: (error) => {
      toast.error(`Failed to delete speaker: ${error.message}`)
    },
  })
}

/*
Usage:
  const { mutate: deleteSpeaker, isPending } = useDeleteImportedSpeaker()

  deleteSpeaker(speaker.id)

  // Note: any analyses that compared against this speaker will have
  // compared_to_speaker_id set to null — the user's results are safe.
*/
