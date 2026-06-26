import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from '@/hooks/queries/useAuth'

export interface CreateImportJobInput {
  source_type: 'youtube_channel' | 'youtube_video' | 'rumble' | 'spotify' | 'upload'
  source_url: string
  num_videos?: number
  target_category_id?: string | null
  custom_name?: string | null
  custom_trait?: string | null
}

export interface CreateImportJobResponse {
  import_id: string
  estimated_completion_minutes: number
  quota: {
    remaining_imports: number
    video_limit: number
    tier: 'free' | 'pro'
  }
}

export function useCreateImportJob() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id

  return useMutation<CreateImportJobResponse, Error, CreateImportJobInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke<CreateImportJobResponse>(
        'create-speaker-import-job',
        { body: input },
      )

      if (error) throw error
      if (!data) throw new Error('No data returned from create-speaker-import-job')
      return data
    },
    onSuccess: (data) => {
      if (!userId) return
      queryClient.invalidateQueries({ queryKey: qk.channelImports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.importQuota(userId) })
      toast.success(`Import started — ready in ~${data.estimated_completion_minutes} min`)
    },
    onError: (error) => {
      toast.error(`Failed to start import: ${error.message}`)
    },
  })
}
