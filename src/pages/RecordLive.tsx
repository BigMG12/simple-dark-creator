import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/record/LiveWaveform";
import { Timer } from "@/components/record/Timer";
import { MicPermissionDialog } from "@/components/record/MicPermissionDialog";
import { useMediaRecorder } from "@/hooks/use-media-recorder";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { recordingSession } from "@/hooks/use-recording-session";
import { uploadAudio, deleteRecordingFile } from "@/lib/storage";
import { ensureProfileExists } from "@/lib/ensureProfile";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/queries";
import { useProfile } from "@/hooks/queries/useProfile";
import { useMentor } from "@/hooks/use-mentor";
import { toast } from "sonner";
import { Square, Loader2 } from "lucide-react";

export default function RecordLive() {
  const navigate = useNavigate();
  // Read the recording session ONCE on mount — `recordingSession.get()` returns
  // a fresh object each call, which would otherwise destabilise effect deps.
  const session = useMemo(() => recordingSession.get(), []);
  const { data: authSession } = useSession();
  const { data: profile } = useProfile();
  // useMentor reads from profile + auto-heals to a valid speaker if the
  // stored selection is dangling. We use it as the source of truth here so
  // the recording always carries a real mentor_speaker_id snapshot.
  const [resolvedMentorId] = useMentor();
  const { state, error, stream, requestPermission, start, stop, teardown, blobRef } = useMediaRecorder();
  const levels = useAudioAnalyser(state === "recording" ? stream : null);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const startedRef = useRef(false);
  const uploadStartedRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session.topic) {
      navigate("/record", { replace: true });
      return;
    }
    (async () => {
      const s = await requestPermission();
      if (s && !startedRef.current) {
        startedRef.current = true;
        start(s);
      }
    })();
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state === "recording") {
      const startedAt = Date.now();
      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 250);
      autoStopRef.current = window.setTimeout(() => stop(), session.duration * 1000);
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
    };
  }, [state, session.duration, stop]);

  useEffect(() => {
    if (state !== "stopped") return;
    if (!blobRef.current || !authSession?.user) return;
    if (uploadStartedRef.current) return;
    uploadStartedRef.current = true;

    const uploadAndAnalyze = async () => {
      setUploading(true);
      const user = authSession.user;
      let uploadedPath: string | null = null;

      try {
        // 1) Make sure the user has a `profiles` row (FK target for recordings).
        await ensureProfileExists(user);

        // 2) Upload audio to Storage.
        try {
          const { path } = await uploadAudio(blobRef.current!, user.id);
          uploadedPath = path;
        } catch (err) {
          console.error("[RecordLive] storage upload failed:", err);
          toast.error("Nie udało się wysłać pliku audio. Spróbuj ponownie.");
          uploadStartedRef.current = false;
          setUploading(false);
          return;
        }

        // 3) Insert recordings row. We try to snapshot the user's currently
        //    selected mentor onto the recording so the analyzer never depends
        //    on a later profile state. If the column doesn't exist yet on
        //    older databases (Postgres 42703), fall back to the basic insert.
        const basePayload = {
          user_id: user.id,
          audio_url: uploadedPath,
          topic: session.topic,
          topic_type:
            session.mode === "random"
              ? "random"
              : session.mode === "challenge"
                ? "speaker-challenge"
                : "custom",
          duration_seconds: session.duration,
          status: "uploaded",
        } as const;

        const mentorId =
          resolvedMentorId ?? profile?.selected_speaker_id ?? null;

        let recording: { id: string } | null = null;
        let insertError: { code?: string; message?: string } | null = null;

        if (mentorId) {
          const withMentor = await supabase
            .from("recordings")
            .insert({ ...basePayload, mentor_speaker_id: mentorId } as never)
            .select()
            .single();
          recording = withMentor.data as { id: string } | null;
          insertError = withMentor.error;

          // Schema doesn't have mentor_speaker_id yet — retry without it.
          if (insertError?.code === "42703") {
            console.warn(
              "[RecordLive] mentor_speaker_id column missing, falling back",
            );
            const fallback = await supabase
              .from("recordings")
              .insert(basePayload)
              .select()
              .single();
            recording = fallback.data as { id: string } | null;
            insertError = fallback.error;
          }
        } else {
          const plain = await supabase
            .from("recordings")
            .insert(basePayload)
            .select()
            .single();
          recording = plain.data as { id: string } | null;
          insertError = plain.error;
        }

        if (insertError || !recording) {
          console.error("[RecordLive] insert recording failed:", insertError);
          // Clean up the orphaned audio file so storage doesn't accumulate junk.
          if (uploadedPath) {
            deleteRecordingFile(uploadedPath).catch((e) =>
              console.warn("[RecordLive] orphan cleanup failed:", e),
            );
          }
          toast.error("Nie udało się zapisać sesji. Sprawdź konto i spróbuj ponownie.");
          uploadStartedRef.current = false;
          setUploading(false);
          return;
        }

        sessionStorage.setItem("bs:recording_id", recording.id);
        navigate("/analyzing");
      } catch (err) {
        console.error("[RecordLive] unexpected error:", err);
        toast.error(err instanceof Error ? err.message : "Coś poszło nie tak.");
        uploadStartedRef.current = false;
        setUploading(false);
      }
    };

    uploadAndAnalyze();
  }, [state, blobRef, authSession, session, navigate, profile, resolvedMentorId]);

  const handleCancel = () => {
    teardown();
    const backTo =
      session.source === "drill" && session.drillId
        ? `/drills/${session.drillId}`
        : "/record";
    recordingSession.clear();
    navigate(backTo, { replace: true });
  };

  const remaining = Math.max(0, session.duration - elapsed);

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary-glow/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-12 px-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-destructive">Nagrywanie</span>
          </div>
          <Timer seconds={elapsed} />
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            {Math.floor(remaining / 60).toString().padStart(2, "0")}:
            {Math.floor(remaining % 60).toString().padStart(2, "0")} pozostało
          </div>
          <div className="mt-6 max-w-2xl text-muted-foreground text-sm md:text-base px-4">
            "{session.topic}"
          </div>
        </div>

        <div className="w-full">
          <LiveWaveform levels={levels} />
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost-dark" onClick={handleCancel} disabled={uploading}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            size="xl"
            onClick={stop}
            disabled={uploading}
            className="rounded-full px-10 shadow-elegant"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" />
                Przesyłanie...
              </>
            ) : (
              <>
                <Square className="fill-current" />
                Stop
              </>
            )}
          </Button>
        </div>
      </div>

      <MicPermissionDialog
        open={state === "error" && !!error && error.kind !== "unsupported"}
        kind={(error?.kind as "denied" | "notfound" | "unknown") ?? "unknown"}
        onRetry={async () => {
          const s = await requestPermission();
          if (s) {
            startedRef.current = true;
            start(s);
          }
        }}
        onBack={handleCancel}
      />
    </div>
  );
}
