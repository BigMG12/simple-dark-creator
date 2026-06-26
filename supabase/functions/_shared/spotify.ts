/**
 * _shared/spotify.ts
 * Spotify Web API helpers for the speaker import pipeline.
 *
 * LEGAL NOTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ Fetching show/episode metadata via the official Spotify Web API is
 *    fully permitted under the Spotify Developer Terms of Service.
 *
 * ✅ Spotify provides episode transcripts via the Web API for some shows
 *    (beta feature). We use this where available.
 *
 * ❌ Downloading audio from Spotify is prohibited. Episodes that do not have
 *    API-provided transcripts cannot be transcribed in this pipeline.
 *    We mark those jobs as failed with a clear message.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SpotifyEpisodeInfo, SpotifyShowMeta } from "./import-types.ts";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// ---------------------------------------------------------------------------
// OAuth client credentials flow
// ---------------------------------------------------------------------------

export async function getSpotifyToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token request failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function spotifyGet<T>(
  path: string,
  token: string,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${SPOTIFY_API}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 5);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return spotifyGet<T>(path, token);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify API ${res.status} at ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Resolve show ID from a Spotify show URL
// Supports: https://open.spotify.com/show/{id}
// ---------------------------------------------------------------------------

export function extractSpotifyShowId(url: string): string {
  const match = url.match(/\/show\/([A-Za-z0-9]+)/);
  if (!match) throw new Error(`Cannot extract show ID from URL: ${url}`);
  return match[1];
}

// ---------------------------------------------------------------------------
// Fetch show metadata
// ---------------------------------------------------------------------------

export async function getSpotifyShow(
  showId: string,
  token: string,
): Promise<SpotifyShowMeta> {
  const data = await spotifyGet<{
    id: string;
    name: string;
    description: string;
    publisher: string;
    total_episodes: number;
  }>(`/shows/${showId}?market=US`, token);

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    publisher: data.publisher,
    totalEpisodes: data.total_episodes,
  };
}

// ---------------------------------------------------------------------------
// List recent episodes (newest first, up to limit)
// ---------------------------------------------------------------------------

export async function listSpotifyEpisodes(
  showId: string,
  token: string,
  limit = 10,
): Promise<SpotifyEpisodeInfo[]> {
  const episodes: SpotifyEpisodeInfo[] = [];
  let offset = 0;
  const pageSize = Math.min(limit, 50);

  while (episodes.length < limit) {
    const data = await spotifyGet<{
      items: Array<{
        id: string;
        name: string;
        description: string;
        duration_ms: number;
        release_date: string;
        audio_preview_url: string | null;
      }>;
      next: string | null;
    }>(`/shows/${showId}/episodes?market=US&limit=${pageSize}&offset=${offset}`, token);

    for (const ep of data.items ?? []) {
      episodes.push({
        id: ep.id,
        name: ep.name,
        description: ep.description,
        durationMs: ep.duration_ms,
        releaseDate: ep.release_date,
      });
      if (episodes.length >= limit) break;
    }

    if (!data.next || episodes.length >= limit) break;
    offset += pageSize;
  }

  return episodes;
}

// ---------------------------------------------------------------------------
// Attempt to fetch transcript for a Spotify episode.
// Spotify provides transcripts for some shows via their API (beta endpoint).
// Returns null if no transcript is available.
//
// NOTE: The /episodes/{id}/transcript endpoint is only available for shows
// that have opted in. Most shows do NOT have transcripts via the API.
// When null is returned, the transcript_jobs row will be marked failed with
// a message directing the user to Spotify shows with transcript support.
// ---------------------------------------------------------------------------

export async function getSpotifyEpisodeTranscript(
  episodeId: string,
  token: string,
): Promise<string | null> {
  try {
    // This endpoint is in beta and not universally available
    const res = await fetch(
      `${SPOTIFY_API}/episodes/${episodeId}/transcript`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) return null;

    const data = await res.json() as {
      sections?: Array<{
        transcript?: string;
        text?: string;
        words?: Array<{ word: string }>;
      }>;
    };

    if (!data.sections?.length) return null;

    const parts: string[] = [];
    for (const section of data.sections) {
      if (section.transcript) {
        parts.push(section.transcript);
      } else if (section.text) {
        parts.push(section.text);
      } else if (section.words?.length) {
        parts.push(section.words.map((w) => w.word).join(" "));
      }
    }

    return parts.length > 0 ? parts.join(" ").trim() : null;
  } catch {
    return null;
  }
}
