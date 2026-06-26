/**
 * _shared/youtube.ts
 * YouTube Data API v3 helpers for the speaker import pipeline.
 *
 * LEGAL NOTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ CAPTION FETCHING via the unofficial timedtext endpoint is the standard
 *    approach used by youtube-transcript-api and similar open-source tools.
 *    The transcript content is already publicly displayed on YouTube.
 *
 * ✅ METADATA fetching (channel info, video list, durations) via the official
 *    YouTube Data API v3 is fully permitted (subject to quota).
 *
 * ❌ AUDIO DOWNLOADING from YouTube is prohibited by YouTube's Terms of Service
 *    (Section 5.B). Do NOT implement audio download for YouTube sources.
 *    If captions are unavailable, mark the job as failed rather than falling
 *    back to audio extraction.
 *
 * API QUOTA (default 10 000 units/day):
 *   search.list:             100 units
 *   videos.list:               1 unit per call (up to 50 videos per call)
 *   playlistItems.list:        1 unit per call (up to 50 items per page)
 *   captions.list:            50 units
 *   captions.download:       200 units  ← expensive; restricted to video owner
 *
 * We avoid captions.download (owner-only) and use the free timedtext endpoint.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  YouTubeChannelMeta,
  YouTubeVideoInfo,
} from "./import-types.ts";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

// ---------------------------------------------------------------------------
// Types for YouTube API responses
// ---------------------------------------------------------------------------

interface YouTubeApiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

interface ChannelListResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails?: { default?: { url: string } };
    };
    statistics?: { subscriberCount?: string };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items?: Array<{
    contentDetails: { videoId: string };
  }>;
}

interface VideoListResponse {
  items?: Array<{
    id: string;
    snippet: { title: string; liveBroadcastContent: string };
    contentDetails: { duration: string };
    status?: { uploadStatus: string };
  }>;
}

// ---------------------------------------------------------------------------
// ISO 8601 duration → seconds
// Handles PT#H#M#S, PT#M#S, PT#S
// ---------------------------------------------------------------------------

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);
  return h * 3600 + m * 60 + s;
}

// ---------------------------------------------------------------------------
// Rate-limit-aware fetch wrapper (backs off on 429)
// ---------------------------------------------------------------------------

async function ytFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? 5);
      await new Promise((r) => setTimeout(r, (retryAfter + attempt * 2) * 1000));
      continue;
    }
    return res;
  }
  throw new Error("YouTube API rate limit exceeded after 3 retries");
}

async function ytJson<T>(url: string): Promise<T> {
  const res = await ytFetch(url);
  const data = await res.json();
  if (!res.ok) {
    const err = data as YouTubeApiError;
    throw new Error(`YouTube API ${err.error?.status}: ${err.error?.message}`);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Extract channel ID from a YouTube channel URL
// Supports: /@handle  /channel/UCxxx  /c/customname  /user/oldname
// ---------------------------------------------------------------------------

export async function resolveChannelId(
  url: string,
  apiKey: string,
): Promise<string> {
  // Direct channel ID
  const directMatch = url.match(/\/channel\/(UC[\w-]{22})/);
  if (directMatch) return directMatch[1];

  // Handle (e.g. @MrBeast)
  const handleMatch = url.match(/\/@([\w.-]+)/);
  if (handleMatch) {
    const handle = handleMatch[1];
    const data = await ytJson<ChannelListResponse>(
      `${YT_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
    );
    const id = data.items?.[0]?.id;
    if (!id) throw new Error(`Could not resolve YouTube handle: @${handle}`);
    return id;
  }

  // /c/ or /user/ — fetch page and read canonical channel ID
  const pageRes = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BIGSpeakingBot/1.0)" },
  });
  const html = await pageRes.text();
  const match = html.match(/"channelId":"(UC[\w-]{22})"/);
  if (match) return match[1];

  throw new Error(`Cannot extract channel ID from URL: ${url}`);
}

// ---------------------------------------------------------------------------
// Get channel metadata
// ---------------------------------------------------------------------------

export async function getChannelInfo(
  channelId: string,
  apiKey: string,
): Promise<YouTubeChannelMeta> {
  const data = await ytJson<ChannelListResponse>(
    `${YT_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`,
  );
  const ch = data.items?.[0];
  if (!ch) throw new Error(`Channel not found: ${channelId}`);

  return {
    channelId: ch.id,
    title: ch.snippet.title,
    description: ch.snippet.description,
    thumbnailUrl: ch.snippet.thumbnails?.default?.url ?? null,
    subscriberCount: ch.statistics?.subscriberCount ?? null,
  };
}

// ---------------------------------------------------------------------------
// List videos from a channel's uploads playlist
// Returns up to maxResults videos filtered to exclude Shorts (<60 s) and
// live-stream recordings.
// Quota cost: 1 (playlistItems) + 1 (videos) per 50 items
// ---------------------------------------------------------------------------

export async function listChannelVideos(
  channelId: string,
  apiKey: string,
  maxResults = 20,
): Promise<YouTubeVideoInfo[]> {
  // Step 1: get the uploads playlist ID
  const chData = await ytJson<ChannelListResponse>(
    `${YT_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
  );
  const uploadsPlaylistId =
    chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(`No uploads playlist for channel ${channelId}`);
  }

  // Step 2: page through playlistItems to collect video IDs (newest first)
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  while (videoIds.length < maxResults * 2) {
    const pageUrl =
      `${YT_API_BASE}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}` +
      `&maxResults=50&key=${apiKey}` +
      (pageToken ? `&pageToken=${pageToken}` : "");

    const page = await ytJson<PlaylistItemsResponse>(pageUrl);
    for (const item of page.items ?? []) {
      videoIds.push(item.contentDetails.videoId);
    }
    if (!page.nextPageToken || videoIds.length >= maxResults * 3) break;
    pageToken = page.nextPageToken;
  }

  if (videoIds.length === 0) return [];

  // Step 3: batch-fetch video details (50 per call) for duration + live status
  const results: YouTubeVideoInfo[] = [];
  for (let i = 0; i < videoIds.length && results.length < maxResults; i += 50) {
    const batch = videoIds.slice(i, i + 50).join(",");
    const vData = await ytJson<VideoListResponse>(
      `${YT_API_BASE}/videos?part=snippet,contentDetails&id=${batch}&key=${apiKey}`,
    );

    for (const v of vData.items ?? []) {
      const duration = parseDuration(v.contentDetails.duration);
      const isLiveStream = v.snippet.liveBroadcastContent !== "none";
      const isShort = duration < 60;

      if (!isLiveStream && !isShort) {
        results.push({
          videoId: v.id,
          title: v.snippet.title,
          durationSeconds: duration,
          isLiveStream,
          isShort,
          hasCaption: true, // optimistically true; will discover during transcript fetch
        });
        if (results.length >= maxResults) break;
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Get single video metadata
// ---------------------------------------------------------------------------

export async function getVideoInfo(
  videoId: string,
  apiKey: string,
): Promise<YouTubeVideoInfo> {
  const data = await ytJson<VideoListResponse>(
    `${YT_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
  );
  const v = data.items?.[0];
  if (!v) throw new Error(`Video not found: ${videoId}`);

  const duration = parseDuration(v.contentDetails.duration);
  return {
    videoId: v.id,
    title: v.snippet.title,
    durationSeconds: duration,
    isLiveStream: v.snippet.liveBroadcastContent !== "none",
    isShort: duration < 60,
    hasCaption: true,
  };
}

// ---------------------------------------------------------------------------
// Fetch transcript text via the unofficial YouTube timedtext endpoint.
//
// YouTube embeds caption track URLs inside the page's ytInitialPlayerResponse.
// We extract these URLs and download the SRV3-format XML, then strip tags to
// produce plain text. This is the approach used by youtube-transcript-api and
// is the only legal way to retrieve captions for videos you don't own.
//
// Returns null if no captions are available for this video.
// ---------------------------------------------------------------------------

export async function fetchYouTubeCaption(
  videoId: string,
): Promise<{ text: string; language: string } | null> {
  // Fetch video page to extract caption track manifest
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!pageRes.ok) {
    throw new Error(`Failed to fetch YouTube page for ${videoId}: ${pageRes.status}`);
  }

  const html = await pageRes.text();

  // Extract ytInitialPlayerResponse JSON blob.
  // Try two patterns: the standard one and a minified-page fallback.
  const playerResponseMatch =
    html.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:\s*(?:var\s+\w+|<\/script>))/s,
    ) ??
    html.match(
      /ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});\s*(?:var|if|<)/,
    );

  if (!playerResponseMatch) return null;

  let playerResponse: Record<string, unknown>;
  try {
    playerResponse = JSON.parse(playerResponseMatch[1]);
  } catch {
    return null;
  }

  // Navigate to caption tracks
  const captionTracks = (
    playerResponse?.captions as Record<string, unknown> | undefined
  )?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;

  const tracks = captionTracks?.captionTracks as Array<{
    baseUrl: string;
    languageCode: string;
    kind?: string;
  }> | undefined;

  if (!tracks || tracks.length === 0) return null;

  // Prefer English manual captions, then English auto-generated, then any
  const preferred =
    tracks.find((t) => t.languageCode.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode.startsWith("en")) ??
    tracks[0];

  // Fetch the caption XML (SRV3 / TTML format)
  const captionRes = await fetch(preferred.baseUrl + "&fmt=srv3");
  if (!captionRes.ok) return null;

  const xml = await captionRes.text();

  // Parse <text start="..." dur="...">content</text> elements
  const textChunks: string[] = [];
  const textPattern = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml)) !== null) {
    const raw = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "") // strip any nested tags
      .trim();
    if (raw) textChunks.push(raw);
  }

  if (textChunks.length === 0) return null;

  return {
    text: textChunks.join(" "),
    language: preferred.languageCode,
  };
}
