import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  useCelebration,
  type BadgeDetails,
} from "@/contexts/CelebrationContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserBadgeRow {
  user_id: string;
  badge_id: string;
  earned_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Opens a Supabase Realtime channel scoped to the current user's badge inserts.
 *
 * When a new `user_badges` row is inserted for this user:
 *   1. Fetches the full badge details from the `badges` table
 *   2. Calls triggerBadgeCelebration() from CelebrationContext so any
 *      connected <BadgeCelebrationModal> can display the achievement
 *
 * The channel is removed on unmount or when userId changes.
 *
 * Requires the `user_badges` table to be in the supabase_realtime publication
 * (see migration 004_enable_realtime.sql).
 *
 * Usage:
 *   // 1. Wrap your app (or layout) with <CelebrationProvider>
 *   // 2. Call this hook once after auth resolves:
 *   const { user } = useAuth();
 *   useBadgeUnlockRealtime(user?.id);
 *
 *   // 3. Render the modal anywhere inside the provider:
 *   const { pendingBadge, dismissCelebration } = useCelebration();
 */
export function useBadgeUnlockRealtime(
  userId: string | null | undefined
): void {
  const { triggerBadgeCelebration } = useCelebration();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_badges:unlocks:${userId}`)
      .on<UserBadgeRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as UserBadgeRow;

          let badge: BadgeDetails | null = null;
          try {
            const { data, error } = await supabase
              .from("badges")
              .select("id, name, description, icon_name, requirement_type, requirement_value")
              .eq("id", row.badge_id)
              .single<BadgeDetails>();

            if (error) {
              console.warn(
                "[useBadgeUnlockRealtime] could not fetch badge details:",
                error.message
              );
            } else {
              badge = data;
            }
          } catch (err) {
            console.warn(
              "[useBadgeUnlockRealtime] unexpected error fetching badge:",
              err
            );
          }

          triggerBadgeCelebration({
            badge_id: row.badge_id,
            earned_at: row.earned_at,
            badge,
          });
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "[useBadgeUnlockRealtime] channel error — will retry automatically:",
            err
          );
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, triggerBadgeCelebration]);
}
