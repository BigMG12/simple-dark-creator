import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from '@/hooks/queries/useAuth'

/**
 * Cancels an in-progress channel import.
 *
 * Two-step process:
 *   1. Calls `cancel-import` edge function which aborts in-flight transcript
 *      jobs on the backend (prevents orphaned work and quota consumption).
 *   2. The edge function updates status to 'cancelled' — we then invalidate
 *      local caches so the UI reflects the change immediately.
 *
 * Only imports with status 'pending' or 'processing' can be cancelled.
 */
export function useCancelImport() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id

  return useMutation<void, Error, string>({
    mutationFn: async (importId: string) => {
      const { error } = await supabase.functions.invoke('cancel-import', {
        body: { import_id: importId },
      })

      if (error) throw error
    },
    onSuccess: (_data, importId) => {
      if (!userId) return
      queryClient.invalidateQueries({ queryKey: qk.channelImports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.channelImport(importId) })
      queryClient.invalidateQueries({ queryKey: qk.importQuota(userId) })
      toast.success('Import cancelled.')
    },
    onError: (error) => {
      toast.error(`Failed to cancel import: ${error.message}`)
    },
  })
}

/*
Usage:
  const { mutate: cancelImport, isPending } = useCancelImport()

  <Button
    disabled={isPending}
    onClick={() => cancelImport(importId)}
  >
    Cancel
  </Button>
*/
