/**
 * process-transcripts
 * Internal function — processes pending transcript_jobs one by one.
 *
 * Flow:
 *   1. Load pending jobs for import_id
 *   2. For each job:
 *      a. youtube_captions  → fetch via unofficial timedtext endpoint (free, legal)
 *      b. spotify_transcript → call Spotify API transcripts endpoint
 *      c. whisper_api        → download from Supabase Storage + call Whisper
 *         (ONLY for user uploads — audio downloading from YouTube/Spotify is not supported)
 *   3. On each completion, increment channel_imports.progress_current
 *   4. Handle timeout: if function approaches the 6-min Supabase limit,
 *      re-trigger itself recursively and exit cleanly
 *   5. When ≥ 60% of jobs complete (or all done), trigger generate-speaker-persona
 */

import {
  CORS_HEADERS,
  createAdminClient,
  invokeFunction,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

import type {
  ChannelImport,
  ProcessTranscriptsRequest,
  TranscriptJob,
} from "../_shared/import-types.ts";

import { fetchYouTubeCaption } from "../_shared/youtube.ts";
import { getSpotifyEpisodeTranscript, getSpotifyToken } from "../_shared/spotify.ts";
import { transcribeUploadedFile } from "../_shared/whisper.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Leave 60 s buffer before Supabase's 6-minute Edge Function ceiling
const TIMEOUT_MS = 5 * 60 * 1000;
// Minimum job completion rate to proceed to persona generation
const MIN_COMPLETION_RATE = 0.6;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: ProcessTranscriptsRequest;
  try {
    body = await req.json() as ProcessTranscriptsRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { import_id } = body;
  if (!import_id) return jsonError("import_id is required", 400);

  const admin = createAdminClient();
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const startTime = Date.now();

  // ── Load import row ───────────────────────────────────────────────────────
  const { data: importRow, error: importErr } = await admin
    .from("channel_imports")
    .select("*")
    .eq("id", import_id)
    .single<ChannelImport>();

  if (importErr || !importRow) {
    return jsonError(`Import not found: ${import_id}`, 404);
  }

  // Idempotency guard — also exit immediately if import was cancelled
  if (
    [
      "complete",
      "failed",
      "cancelled",
      "analyzing_style",
      "generating_persona",
      "embedding",
    ].includes(importRow.status)
  ) {
    return jsonOk({ skipped: true, status: importRow.status });
  }

  // ── Helper: mark failed ───────────────────────────────────────────────────
  async function failImport(msg: string): Promise<void> {
    console.error(`[${import_id}] process-transcripts failed:`, msg);
    await admin
      .from("channel_imports")
      .update({ status: "failed", error_message: msg })
      .eq("id", import_id);
  }

  // ── Spotify token (fetched once if needed) ────────────────────────────────
  let spotifyToken: string | null = null;
  async function ensureSpotifyToken(): Promise<string> {
    if (spotifyToken) return spotifyToken;
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new Error("Spotify credentials not configured");
    }
    spotifyToken = await getSpotifyToken(clientId, clientSecret);
    return spotifyToken;
  }

  // ── Main processing loop ──────────────────────────────────────────────────
  let processedCount = 0;

  try {
    while (true) {
      // Timeout check: if close to the 6-minute limit, re-trigger self
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.warn(`[${import_id}] Approaching timeout — re-triggering process-transcripts`);
        EdgeRuntime.waitUntil(
          invokeFunction("process-transcripts", { import_id }).catch(console.error),
        );
        return jsonOk({ requeued: true, processed_this_run: processedCount });
      }

      // Check if import was cancelled mid-flight
      const { data: currentImport } = await admin
        .from("channel_imports")
        .select("status")
        .eq("id", import_id)
        .single<{ status: string }>();

      if (currentImport?.status === "cancelled") {
        console.log(`[${import_id}] Import cancelled — stopping transcript processing`);
        return jsonOk({ cancelled: true, processed_this_run: processedCount });
      }

      // Fetch the next pending job (atomic: set in_progress to avoid double-processing)
      const { data: jobs, error: jobsErr } = await admin
        .from("transcript_jobs")
        .select("*")
        .eq("import_id", import_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      if (jobsErr) {
        await failImport(`Failed to query transcript_jobs: ${jobsErr.message}`);
        return jsonError(jobsErr.message, 500);
      }

      // No more pending jobs — evaluate if we have enough to proceed
      if (!jobs || jobs.length === 0) break;

      const job = jobs[0] as TranscriptJob;

      // Claim the job atomically
      const { error: claimErr } = await admin
        .from("transcript_jobs")
        .update({ status: "in_progress" })
        .eq("id", job.id)
        .eq("status", "pending"); // prevents race condition in concurrent invocations

      if (claimErr) {
        // Another invocation grabbed it — skip and continue
        continue;
      }

      // ── Process job ─────────────────────────────────────────────────────
      let transcriptText: string | null = null;
      let durationSeconds: number | null = job.duration_seconds;
      let jobError: string | null = null;

      try {
        switch (job.transcript_method) {
          // ── YouTube captions (free, legal, preferred) ──────────────────
          case "youtube_captions": {
            if (!job.video_id) throw new Error("No video_id on youtube_captions job");

            const result = await fetchYouTubeCaption(job.video_id);

            if (!result) {
              // No captions available — this is a soft failure; we skip this
              // video but continue processing the rest. We do NOT fall back to
              // audio downloading (YouTube ToS violation).
              throw new Error(
                `No captions available for video ${job.video_id}. ` +
                  "Only videos with auto-generated or manually uploaded captions can be imported.",
              );
            }

            transcriptText = result.text;
            break;
          }

          // ── Spotify transcript (official API) ──────────────────────────
          case "spotify_transcript": {
            const token = await ensureSpotifyToken();
            const episodeId = job.video_id;
            if (!episodeId) throw new Error("No episode ID on spotify_transcript job");

            const transcript = await getSpotifyEpisodeTranscript(episodeId, token);

            if (!transcript) {
              throw new Error(
                `Spotify episode ${episodeId} does not have an API-provided transcript. ` +
                  "Only Spotify shows that have opted into the transcripts program are supported.",
              );
            }

            transcriptText = transcript;
            break;
          }

          // ── Whisper (user uploads ONLY) ────────────────────────────────
          case "whisper_api": {
            if (!job.storage_path) {
              throw new Error(
                "Whisper transcription is only supported for user-uploaded files. " +
                  "This job has no storage_path.",
              );
            }
            if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

            const result = await transcribeUploadedFile(
              job.storage_path,
              admin,
              openaiKey,
            );

            transcriptText = result.text;
            if (result.durationSeconds > 0) {
              durationSeconds = result.durationSeconds;
            }
            break;
          }

          default:
            throw new Error(`Unknown transcript_method: ${job.transcript_method}`);
        }
      } catch (err: unknown) {
        jobError = err instanceof Error ? err.message : String(err);
        console.error(`[${import_id}] Job ${job.id} failed:`, jobError);
      }

      // ── Update job row ───────────────────────────────────────────────────
      if (jobError) {
        await admin
          .from("transcript_jobs")
          .update({ status: "failed", error_message: jobError })
          .eq("id", job.id);
      } else {
        await admin
          .from("transcript_jobs")
          .update({
            status: "complete",
            transcript_text: transcriptText,
            duration_seconds: durationSeconds,
          })
          .eq("id", job.id);
      }

      // ── Increment progress on the parent import ──────────────────────────
      await admin.rpc("increment_import_progress", { p_import_id: import_id });

      processedCount++;
    }

    // ── Check overall completion ─────────────────────────────────────────
    const { data: stats } = await admin
      .from("transcript_jobs")
      .select("status")
      .eq("import_id", import_id);

    const allJobs = stats ?? [];
    const completedJobs = allJobs.filter(
      (j: { status: string }) => j.status === "complete",
    ).length;
    const totalJobs = allJobs.length;
    const completionRate = totalJobs > 0 ? completedJobs / totalJobs : 0;

    console.log(
      `[${import_id}] Jobs: ${completedJobs}/${totalJobs} complete (${Math.round(completionRate * 100)}%)`,
    );

    if (completionRate < MIN_COMPLETION_RATE && totalJobs > 0) {
      const msg =
        `Insufficient transcripts: only ${completedJobs}/${totalJobs} jobs completed ` +
        `(${Math.round(completionRate * 100)}%, minimum is ${MIN_COMPLETION_RATE * 100}%). ` +
        "Likely cause: captions not available. Try a channel with auto-generated captions.";

      await failImport(msg);
      return jsonOk({ import_id, failed: true, reason: msg });
    }

    // ── Trigger persona generation ───────────────────────────────────────
    EdgeRuntime.waitUntil(
      invokeFunction("generate-speaker-persona", { import_id }).catch(
        (err: unknown) =>
          console.error(
            `[${import_id}] Failed to trigger generate-speaker-persona:`,
            err instanceof Error ? err.message : String(err),
          ),
      ),
    );

    return jsonOk({
      import_id,
      jobs_completed: completedJobs,
      jobs_total: totalJobs,
      processed_this_run: processedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await failImport(msg);
    return jsonError(msg, 500);
  }
});
