import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from '@/hooks/queries/useAuth'
import { useNotifications } from '@/contexts/NotificationContext'
import type { ChannelImport } from '@/lib/database.types'

/**
 * Subscribes to the channel_imports table for the current user via Supabase Realtime.
 *
 * On every UPDATE:
 *   - Invalidates qk.channelImports (list) and the specific qk.channelImport(id)
 *
 * On status transition → 'complete':
 *   - Dispatches a global 'import_complete' notification (shown in the app's
 *     notification tray and as a toast via NotificationContext)
 *   - Also invalidates myImportedSpeakers so the new speaker appears immediately
 *
 * The channel is removed and cleaned up on unmount or when userId changes.
 *
 * Requires REPLICA IDENTITY FULL on `channel_imports` so UPDATE payloads
 * carry the old row for status transition detection.
 *
 * Mount this once at the app shell level (e.g., inside AppShell).
 */
export function useChannelImportRealtime(): void {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id
  const { dispatch } = useNotifications()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`channel_imports:user:${userId}`)
      .on<ChannelImport>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channel_imports',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as ChannelImport
          const prev = payload.old as Partial<ChannelImport>

          // Always invalidate the list and the specific import
          queryClient.invalidateQueries({ queryKey: qk.channelImports(userId) })
          queryClient.invalidateQueries({ queryKey: qk.channelImport(next.id) })

          const justCompleted =
            next.status === 'complete' &&
            prev.status !== 'complete'

          if (justCompleted) {
            queryClient.invalidateQueries({ queryKey: qk.myImportedSpeakers(userId) })
            queryClient.invalidateQueries({ queryKey: ['speakersByCategory'] })
            queryClient.invalidateQueries({ queryKey: qk.importQuota(userId) })

            dispatch({
              type: 'ADD',
              notification: {
                kind: 'import_complete',
                title: 'Import complete',
                body: `${next.custom_name ?? (next.source_metadata as any)?.channelTitle ?? 'Your channel'} has been imported successfully.`,
                meta: { importId: next.id },
              },
            })
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[useChannelImportRealtime] channel error — will retry automatically:', err)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, queryClient, dispatch])
}

/*
Usage (mount once in AppShell or a top-level layout component):
  function AppShell() {
    useChannelImportRealtime()
    return <Outlet />
  }
*/
