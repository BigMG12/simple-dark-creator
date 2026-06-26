/**
 * run-import-orchestrator
 * Internal function — called by create-speaker-import-job (and by cron retry).
 *
 * Flow:
 *   1. Load channel_imports row, guard against re-processing
 *   2. Set status = 'fetching_metadata'
 *   3. Branch by source_type → fetch platform metadata
 *   4. Insert transcript_jobs (one per video/episode/file)
 *   5. Set status = 'fetching_transcripts', progress_total = job count
 *   6. Trigger process-transcripts (fire-and-forget)
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
  OrchestratorRequest,
  RumbleVideoInfo,
  SourceType,
  SpotifyEpisodeInfo,
  TranscriptMethod,
  YouTubeVideoInfo,
} from "../_shared/import-types.ts";

import {
  fetchYouTubeCaption,
  getChannelInfo,
  getVideoInfo,
  listChannelVideos,
  resolveChannelId,
} from "../_shared/youtube.ts";

import {
  extractSpotifyShowId,
  getSpotifyShow,
  getSpotifyToken,
  listSpotifyEpisodes,
} from "../_shared/spotify.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: OrchestratorRequest & { num_videos?: number };
  try {
    body = await req.json() as OrchestratorRequest & { num_videos?: number };
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { import_id, num_videos = 20 } = body;
  if (!import_id) return jsonError("import_id is required", 400);

  const admin = createAdminClient();

  // ── Load import row ───────────────────────────────────────────────────────
  const { data: importRow, error: fetchErr } = await admin
    .from("channel_imports")
    .select("*")
    .eq("id", import_id)
    .single<ChannelImport>();

  if (fetchErr || !importRow) {
    return jsonError(`Import not found: ${import_id}`, 404);
  }

  // Idempotency: don't re-process if already past queued/failed
  if (!["queued", "failed"].includes(importRow.status)) {
    return jsonOk({ skipped: true, status: importRow.status });
  }

  // ── Helper: mark failed ───────────────────────────────────────────────────
  async function fail(msg: string): Promise<Response> {
    console.error(`[${import_id}] Orchestrator failed:`, msg);
    await admin
      .from("channel_imports")
      .update({ status: "failed", error_message: msg })
      .eq("id", import_id);
    return jsonError(msg, 500);
  }

  // ── Clean up any leftover transcript_jobs from a prior attempt ────────────
  // On retry (status was 'failed' or was reset to 'queued' by the recovery cron),
  // old job rows must be removed so we can insert a fresh set without duplicates.
  // retry-import already does this, but the recovery cron path does not, so we
  // also clean up here for safety.
  const { error: cleanupErr } = await admin
    .from("transcript_jobs")
    .delete()
    .eq("import_id", import_id);
  if (cleanupErr) {
    console.warn(`[${import_id}] Failed to clean up old transcript_jobs:`, cleanupErr.message);
  }

  // ── Set status = fetching_metadata ────────────────────────────────────────
  await admin
    .from("channel_imports")
    .update({ status: "fetching_metadata", error_message: null })
    .eq("id", import_id);

  try {
    const { source_type, source_url } = importRow;

    // ── Branch by source_type ───────────────────────────────────────────────
    interface JobSpec {
      source_url: string;
      video_id: string;
      title: string;
      transcript_method: TranscriptMethod;
      duration_seconds: number | null;
      storage_path: string | null;
    }

    const jobSpecs: JobSpec[] = [];
    let sourceMeta: Record<string, unknown> = {};

    switch (source_type as SourceType) {
      // ── YouTube channel ───────────────────────────────────────────────────
      case "youtube_channel": {
        const ytApiKey = Deno.env.get("YOUTUBE_API_KEY");
        if (!ytApiKey) return await fail("YOUTUBE_API_KEY secret not configured");

        const channelId = await resolveChannelId(source_url, ytApiKey);
        const channelInfo = await getChannelInfo(channelId, ytApiKey);
        const videos = await listChannelVideos(channelId, ytApiKey, num_videos);

        sourceMeta = { ...channelInfo, video_count: videos.length };

        for (const v of videos) {
          jobSpecs.push({
            source_url: `https://www.youtube.com/watch?v=${v.videoId}`,
            video_id: v.videoId,
            title: v.title,
            transcript_method: "youtube_captions",
            duration_seconds: v.durationSeconds,
            storage_path: null,
          });
        }
        break;
      }

      // ── Single YouTube video ──────────────────────────────────────────────
      case "youtube_video": {
        const ytApiKey = Deno.env.get("YOUTUBE_API_KEY");
        if (!ytApiKey) return await fail("YOUTUBE_API_KEY secret not configured");

        const videoIdMatch = source_url.match(
          /(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
        );
        if (!videoIdMatch) return await fail("Could not parse YouTube video ID from URL");

        const videoId = videoIdMatch[1];
        const info = await getVideoInfo(videoId, ytApiKey);

        if (info.isLiveStream) return await fail("Live streams cannot be imported");
        if (info.isShort) return await fail("YouTube Shorts (<60 s) cannot be imported");

        sourceMeta = { videoId, title: info.title, durationSeconds: info.durationSeconds };
        jobSpecs.push({
          source_url,
          video_id: videoId,
          title: info.title,
          transcript_method: "youtube_captions",
          duration_seconds: info.durationSeconds,
          storage_path: null,
        });
        break;
      }

      // ── Rumble ────────────────────────────────────────────────────────────
      case "rumble": {
        // Rumble does not provide an official public API.
        // We fetch the page and extract basic Open Graph metadata + embedded
        // video info. This is best-effort; only videos with embedded captions
        // (the <track> element) can be transcribed without audio download.
        const videos = await scrapeRumblePage(source_url, num_videos);

        sourceMeta = { scraped_url: source_url, video_count: videos.length };

        for (const v of videos) {
          jobSpecs.push({
            source_url: v.videoId.startsWith("http")
              ? v.videoId
              : `https://rumble.com/embed/${v.videoId}`,
            video_id: v.videoId,
            title: v.title,
            // Rumble has no public caption API; fall back to whisper only for
            // user-uploaded content. For third-party Rumble videos we cannot
            // legally download audio, so this will likely fail at transcript step.
            transcript_method: "whisper_api",
            duration_seconds: v.durationSeconds,
            storage_path: null,
          });
        }

        if (jobSpecs.length === 0) {
          return await fail(
            "No embeddable videos found on this Rumble page. " +
              "Rumble import works best with single video URLs.",
          );
        }
        break;
      }

      // ── Spotify ───────────────────────────────────────────────────────────
      case "spotify": {
        const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
        const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
        if (!clientId || !clientSecret) {
          return await fail("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not configured");
        }

        const token = await getSpotifyToken(clientId, clientSecret);
        const showId = extractSpotifyShowId(source_url);
        const show = await getSpotifyShow(showId, token);
        const episodes = await listSpotifyEpisodes(showId, token, num_videos);

        sourceMeta = { ...show, episode_count: episodes.length };

        for (const ep of episodes) {
          jobSpecs.push({
            source_url: `https://open.spotify.com/episode/${ep.id}`,
            video_id: ep.id,
            title: ep.name,
            transcript_method: "spotify_transcript",
            duration_seconds: Math.round(ep.durationMs / 1000),
            storage_path: null,
          });
        }
        break;
      }

      // ── User upload ───────────────────────────────────────────────────────
      case "upload": {
        // source_url for uploads is the Supabase Storage path
        const filename = source_url.split("/").pop() ?? "audio";
        sourceMeta = { storage_path: source_url, filename };

        jobSpecs.push({
          source_url,
          video_id: "",
          title: filename,
          transcript_method: "whisper_api",
          duration_seconds: null,
          storage_path: source_url,
        });
        break;
      }

      default:
        return await fail(`Unknown source_type: ${source_type}`);
    }

    if (jobSpecs.length === 0) {
      return await fail("No transcribable items found for this source");
    }

    // ── Save metadata + update progress total ─────────────────────────────
    await admin
      .from("channel_imports")
      .update({
        source_metadata: sourceMeta,
        progress_total: jobSpecs.length,
        status: "fetching_transcripts",
      })
      .eq("id", import_id);

    // ── Insert transcript_jobs ────────────────────────────────────────────
    const jobRows = jobSpecs.map((spec) => ({
      import_id,
      source_url: spec.source_url,
      video_id: spec.video_id || null,
      title: spec.title,
      transcript_method: spec.transcript_method,
      status: "pending",
      duration_seconds: spec.duration_seconds,
      storage_path: spec.storage_path,
    }));

    const { error: jobInsertErr } = await admin
      .from("transcript_jobs")
      .insert(jobRows);

    if (jobInsertErr) {
      return await fail(`Failed to insert transcript_jobs: ${jobInsertErr.message}`);
    }

    // ── Trigger process-transcripts (fire-and-forget) ─────────────────────
    EdgeRuntime.waitUntil(
      invokeFunction("process-transcripts", { import_id }).catch(
        (err: unknown) =>
          console.error(
            `[${import_id}] Failed to trigger process-transcripts:`,
            err instanceof Error ? err.message : String(err),
          ),
      ),
    );

    return jsonOk({ import_id, jobs_created: jobSpecs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return await fail(msg);
  }
});

// ---------------------------------------------------------------------------
// Rumble scraper (best-effort — no official API)
// ---------------------------------------------------------------------------

async function scrapeRumblePage(
  url: string,
  _maxVideos: number,
): Promise<RumbleVideoInfo[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BIGSpeakingBot/1.0)",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch Rumble page: ${res.status}`);

  const html = await res.text();

  // Try to extract a single embedded video
  const embedMatch = html.match(/\/embed\/(v[\w]+)/);
  const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
  const durationMatch = html.match(/"duration"\s*:\s*(\d+)/);

  if (!embedMatch) return [];

  return [{
    videoId: embedMatch[1],
    title: titleMatch?.[1] ?? "Rumble Video",
    durationSeconds: durationMatch ? Number(durationMatch[1]) : 0,
  }];
}
