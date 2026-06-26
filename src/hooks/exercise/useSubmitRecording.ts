import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadAudio, deleteRecordingFile } from "@/lib/storage";
import { ensureProfileExists } from "@/lib/ensureProfile";
import { useAuth } from "@/contexts/AuthContext";

export interface SubmitRecordingPayload {
  drillId?: string | null;
  topic?: string | null;
  topicType: "drill" | "random" | "custom" | "session";
  durationSeconds: number;
  sessionId?: string | null;
  stepOrder?: number | null;
}

interface SubmitResult {
  recordingId: string;
}

/**
 * Uploads a recorded blob → creates a `recordings` row → invokes the
 * `analyze-recording` edge function. Defensive: any individual failure
 * is caught and surfaced via the returned `error`, never thrown.
 */
export function useSubmitRecording() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const submit = useCallback(
    async (blob: Blob, payload: SubmitRecordingPayload): Promise<SubmitResult | null> => {
      if (!user) {
        setError("Musisz być zalogowany.");
        return null;
      }
      setIsSubmitting(true);
      setError(null);

      let uploadedPath: string | null = null;
      try {
        await ensureProfileExists(user);

        // 1) Upload to storage.
        try {
          const { path } = await uploadAudio(blob, user.id);
          uploadedPath = path;
        } catch (e) {
          console.error("[submitRecording] upload failed", e);
          setError("Nie udało się wysłać pliku audio.");
          return null;
        }

        // 2) Insert recordings row. Extra columns (drill_id, training_session_id,
        //    session_step_order, mentor_speaker_id) are added defensively — if
        //    the column doesn't exist (42703) we retry with a slimmer payload.
        const basePayload: Record<string, unknown> = {
          user_id: user.id,
          audio_url: uploadedPath,
          topic: payload.topic ?? null,
          topic_type: payload.topicType,
          duration_seconds: payload.durationSeconds,
          status: "uploaded",
        };

        const extended: Record<string, unknown> = { ...basePayload };
        if (payload.drillId) extended.drill_id = payload.drillId;
        if (payload.sessionId) {
          extended.training_session_id = payload.sessionId;
          if (typeof payload.stepOrder === "number") {
            extended.session_step_order = payload.stepOrder;
          }
        }

        const tryInsert = async (body: Record<string, unknown>) => {
          return supabase
            .from("recordings")
            .insert(body as never)
            .select("id")
            .single();
        };

        let { data: inserted, error: insertErr } = await tryInsert(extended);
        if (insertErr?.code === "42703") {
          console.warn("[submitRecording] extended insert failed, retrying basic", insertErr);
          ({ data: inserted, error: insertErr } = await tryInsert(basePayload));
        }

        if (insertErr || !inserted) {
          console.error("[submitRecording] insert failed", insertErr);
          if (uploadedPath) {
            deleteRecordingFile(uploadedPath).catch(() => {});
          }
          setError("Nie udało się zapisać nagrania.");
          return null;
        }

        const newId = (inserted as { id: string }).id;
        setRecordingId(newId);

        // 3) Invoke analyze-recording (fire-and-await; function returns 202 fast).
        try {
          const { error: fnErr } = await supabase.functions.invoke("analyze-recording", {
            body: { recording_id: newId },
          });
          if (fnErr) {
            console.warn("[submitRecording] analyze-recording invoke failed", fnErr);
            // Non-fatal: recording exists; user can retry analysis later.
          }
        } catch (e) {
          console.warn("[submitRecording] analyze-recording threw", e);
        }

        return { recordingId: newId };
      } catch (e) {
        console.error("[submitRecording] unexpected", e);
        setError(e instanceof Error ? e.message : "Coś poszło nie tak.");
        if (uploadedPath) {
          deleteRecordingFile(uploadedPath).catch(() => {});
        }
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  return { submit, isSubmitting, error, recordingId };
}
