import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecordingStatus = "uploaded" | "analyzing" | "complete" | "failed";

interface RecordingRow {
  id: string;
  user_id: string;
  audio_url: string | null;
  status: RecordingStatus;
  drill_id: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  topic: string | null;
  topic_type: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Opens a Supabase Realtime channel scoped to the current user's recordings.
 *
 * When a recording transitions from `analyzing` → `complete` the hook:
 *   1. Invalidates ['recordings', userId]  → refetches the recordings list
 *   2. Invalidates ['dashboardStats', userId] → refreshes aggregate stats
 *   3. Invalidates ['profile', userId]     → picks up new XP / level
 *
 * The channel is removed on unmount or when userId changes.
 *
 * Requires REPLICA IDENTITY FULL on `recordings` so UPDATE payloads include
 * the old row (see migration 004_enable_realtime.sql).
 *
 * Usage:
 *   const { user } = useAuth();
 *   useRecordingStatusRealtime(user?.id);
 */
export function useRecordingStatusRealtime(
  userId: string | null | undefined
): void {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`recordings:status:${userId}`)
      .on<RecordingRow>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "recordings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as RecordingRow;
          // payload.old is populated because REPLICA IDENTITY FULL is set.
          // Defensive cast: old may only carry the PK if replication identity is default.
          const prev = payload.old as Partial<RecordingRow>;

          const analysisJustFinished =
            next.status === "complete" &&
            (prev.status === "analyzing" || prev.status == null);

          if (!analysisJustFinished) return;

          queryClient.invalidateQueries({ queryKey: ["recordings", userId] });
          queryClient.invalidateQueries({
            queryKey: ["dashboardStats", userId],
          });
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "[useRecordingStatusRealtime] channel error — will retry automatically:",
            err
          );
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, queryClient]);
}
