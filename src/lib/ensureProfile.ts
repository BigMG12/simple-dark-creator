import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Ensures a row exists in `profiles` for the given auth user.
 * Uses upsert with `onConflict: 'id'` and `ignoreDuplicates: true`
 * so it is safe to call repeatedly. Required because several tables
 * (recordings, achievements_log, ...) FK to profiles.id.
 */
export async function ensureProfileExists(user: User): Promise<void> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      null,
    avatar_url:
      (meta.avatar_url as string | undefined) ??
      (meta.picture as string | undefined) ??
      null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    // Don't throw — call sites should be defensive. Log so we still see it.
    console.warn("[ensureProfileExists] upsert failed:", error.message);
  }
}
