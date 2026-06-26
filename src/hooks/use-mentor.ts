import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import { useSession } from "@/hooks/queries/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { useSpeakers } from "@/hooks/queries/useSpeakers";
import { toast } from "sonner";

const LS_KEY = "bs:mentorId";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}

/**
 * mentorStore — kept for backward-compat with any leftover imports.
 * The source of truth is now `profiles.selected_speaker_id` in the database.
 * localStorage is used only as a transient cache for instant UI before the
 * profile query resolves.
 */
export const mentorStore = {
  get(): string | null {
    try {
      const v = localStorage.getItem(LS_KEY);
      // Drop legacy slug values (e.g. "david-goggins") that pre-date the
      // DB-backed mentor system. Only return real UUIDs.
      if (!isUuid(v)) {
        if (v) {
          try {
            localStorage.removeItem(LS_KEY);
          } catch {}
        }
        return null;
      }
      return v;
    } catch {
      return null;
    }
  },
  set(id: string) {
    try {
      if (!isUuid(id)) return;
      localStorage.setItem(LS_KEY, id);
      window.dispatchEvent(new CustomEvent("bs:mentor-change", { detail: id }));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(LS_KEY);
      window.dispatchEvent(new CustomEvent("bs:mentor-change", { detail: null }));
    } catch {}
  },
};

/**
 * useMentor — returns [selectedSpeakerId, setSelectedSpeakerId].
 *
 * Reads from `profiles.selected_speaker_id` (single source of truth).
 * Writes update the database and invalidate the profile cache so every
 * consumer of `useProfile()` re-renders with the new mentor.
 */
export function useMentor() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile();
  const { data: speakers } = useSpeakers();

  // Prefer DB value; fall back to localStorage for the very first paint
  // before the profile query resolves.
  const rawId = profile?.selected_speaker_id ?? mentorStore.get();

  // Auto-heal: if the stored id no longer exists in the speakers table
  // (orphaned by a previous dedupe / seed reset), treat as no selection.
  const idExists =
    !!rawId && !!speakers && speakers.some((s) => s.id === rawId);
  const id = idExists ? rawId : null;

  const setMentor = useCallback(
    async (next: string) => {
      if (!isUuid(next)) {
        toast.error("Nieprawidłowy mentor", {
          description: "Ten mówca nie istnieje jeszcze w bazie.",
        });
        return false;
      }

      if (!userId) {
        toast.error("Musisz być zalogowany, żeby wybrać mentora.");
        return false;
      }

      const previousMentorId = mentorStore.get();

      // Optimistic local cache so UI flips immediately.
      mentorStore.set(next);

      const { error } = await supabase
        .from("profiles")
        .update({ selected_speaker_id: next })
        .eq("id", userId);

      if (error) {
        if (previousMentorId) {
          mentorStore.set(previousMentorId);
        } else {
          mentorStore.clear();
        }
        toast.error("Nie udało się zapisać mentora", {
          description: error.message,
        });
        return false;
      }

      // Refresh anything that depends on the selected mentor.
      queryClient.invalidateQueries({ queryKey: qk.profile(userId) });
      queryClient.invalidateQueries({ queryKey: qk.dashboardStats(userId) });
      return true;
    },
    [queryClient, userId],
  );

  // Self-heal: persist a valid fallback so analyze-recording never sees
  // a dangling selected_speaker_id again.
  useEffect(() => {
    if (!userId || !speakers || speakers.length === 0) return;
    if (id) return;
    if (!rawId) return; // nothing to heal — user simply hasn't picked yet
    const fallback = speakers[0]?.id;
    if (!fallback) return;
    void setMentor(fallback);
  }, [userId, speakers, id, rawId, setMentor]);

  return [id, setMentor] as const;
}
