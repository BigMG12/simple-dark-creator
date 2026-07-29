import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSession } from "./useAuth";

export interface RecentAttempt {
  id: string;
  createdAt: string;
  durationSeconds: number | null;
  topic: string;
  drillId: string | null;
  signedUrl: string | null;
  overallScore: number | null;
}

/**
 * Recent solo recordings for the current user, each with a fresh signed URL
 * for playback. Silently returns [] when the recordings table is missing.
 */
export function useRecentDrillRecordings(limit = 5) {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery<RecentAttempt[]>({
    queryKey: ["recentDrillRecordings", userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select(
            "id, created_at, duration_seconds, topic, drill_id, audio_url, analyses(overall_score)",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        const rows = data ?? [];
        const signed = await Promise.all(
          rows.map(async (r: any) => {
            if (!r.audio_url) return null;
            // audio_url may already be a full URL; if so, use it verbatim.
            if (/^https?:\/\//i.test(r.audio_url)) return r.audio_url as string;
            const { data: s } = await supabase.storage
              .from("recordings")
              .createSignedUrl(r.audio_url, 3600);
            return s?.signedUrl ?? null;
          }),
        );

        return rows.map((r: any, i: number): RecentAttempt => {
          const a = Array.isArray(r.analyses) ? r.analyses[0] : r.analyses;
          return {
            id: r.id,
            createdAt: r.created_at,
            durationSeconds: r.duration_seconds,
            topic: r.topic,
            drillId: r.drill_id,
            signedUrl: signed[i],
            overallScore: typeof a?.overall_score === "number" ? a.overall_score : null,
          };
        });
      } catch (err) {
        console.warn("[recentDrillRecordings] fetch failed", err);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
