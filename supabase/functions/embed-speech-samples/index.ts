/**
 * embed-speech-samples
 * Final step — creates 1536-dim OpenAI embeddings for all transcript chunks
 * and stores them in speech_embeddings for similarity-search use cases.
 *
 * Flow:
 *   1. Set status = 'embedding'
 *   2. Fetch all complete transcript_jobs
 *   3. Chunk each transcript into ~500-token segments (with 50-token overlap)
 *   4. Sample up to MAX_CHUNKS chunks if total exceeds that limit
 *   5. Batch-embed via OpenAI text-embedding-3-small (1536 dims)
 *   6. Upsert into speech_embeddings (delete old ones for this import first)
 *   7. Update speakers stats: transcribed_minutes, video_count_analyzed
 *   8. Set channel_imports.status = 'complete'
 */

import {
  CORS_HEADERS,
  createAdminClient,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

import type {
  EmbedSamplesRequest,
  TranscriptJob,
} from "../_shared/import-types.ts";

import { chunkText, embedChunks } from "../_shared/openai.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_CHUNKS = 100; // max chunks to embed per import (cost control)
const CHUNK_WORDS = 375; // ≈500 tokens
const OVERLAP_WORDS = 37; // ≈50 tokens

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: EmbedSamplesRequest;
  try {
    body = await req.json() as EmbedSamplesRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { speaker_id, import_id } = body;
  if (!speaker_id || !import_id) {
    return jsonError("speaker_id and import_id are required", 400);
  }

  const admin = createAdminClient();

  async function fail(msg: string): Promise<Response> {
    console.error(`[${import_id}] embed-speech-samples failed:`, msg);
    await admin
      .from("channel_imports")
      .update({ status: "failed", error_message: msg })
      .eq("id", import_id);
    return jsonError(msg, 500);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return await fail("OPENAI_API_KEY not configured");

  // ── Set status = 'embedding' ──────────────────────────────────────────────
  await admin
    .from("channel_imports")
    .update({ status: "embedding" })
    .eq("id", import_id);

  try {
    // ── Fetch all complete transcripts ──────────────────────────────────────
    const { data: jobs, error: jobsErr } = await admin
      .from("transcript_jobs")
      .select("id, transcript_text, duration_seconds, title")
      .eq("import_id", import_id)
      .eq("status", "complete")
      .not("transcript_text", "is", null);

    if (jobsErr) return await fail(`Failed to fetch jobs: ${jobsErr.message}`);

    const completedJobs = (jobs ?? []) as Pick<
      TranscriptJob,
      "id" | "transcript_text" | "duration_seconds" | "title"
    >[];

    if (completedJobs.length === 0) {
      return await fail("No completed transcripts to embed");
    }

    // ── Build all chunks across all transcripts ────────────────────────────
    interface TaggedChunk {
      text: string;
      sourceJobId: string;
    }

    const allChunks: TaggedChunk[] = [];

    for (const job of completedJobs) {
      if (!job.transcript_text) continue;
      const chunks = chunkText(job.transcript_text, CHUNK_WORDS, OVERLAP_WORDS);
      for (const chunk of chunks) {
        allChunks.push({ text: chunk, sourceJobId: job.id });
      }
    }

    console.log(
      `[${import_id}] Total chunks: ${allChunks.length} (will sample ${Math.min(allChunks.length, MAX_CHUNKS)})`,
    );

    // ── Sample representative cross-section if over limit ─────────────────
    const sampled: TaggedChunk[] = allChunks.length <= MAX_CHUNKS
      ? allChunks
      : sampleEvenly(allChunks, MAX_CHUNKS);

    // ── Delete any previously embedded chunks for this import ─────────────
    // Allows safe re-runs without duplicating embeddings
    await admin
      .from("speech_embeddings")
      .delete()
      .eq("import_id", import_id);

    // ── Embed in batches of 100 ────────────────────────────────────────────
    const { embeddings } = await embedChunks(
      sampled.map((c) => c.text),
      openaiKey,
    );

    if (embeddings.length !== sampled.length) {
      return await fail(
        `Embedding count mismatch: expected ${sampled.length}, got ${embeddings.length}`,
      );
    }

    // ── Insert into speech_embeddings ─────────────────────────────────────
    const rows = sampled.map((chunk, i) => ({
      speaker_id,
      import_id,
      chunk_index: i,
      chunk_text: chunk.text,
      embedding: JSON.stringify(embeddings[i]), // pgvector accepts JSON array
    }));

    // Insert in batches of 50 to avoid payload size limits
    const INSERT_BATCH = 50;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const batch = rows.slice(i, i + INSERT_BATCH);
      const { error: insertErr } = await admin
        .from("speech_embeddings")
        .insert(batch);

      if (insertErr) {
        return await fail(`Failed to insert embeddings batch: ${insertErr.message}`);
      }
    }

    // ── Update speaker stats ──────────────────────────────────────────────
    const totalDurationSeconds = completedJobs.reduce(
      (sum, j) => sum + (j.duration_seconds ?? 0),
      0,
    );
    const transcribedMinutes = totalDurationSeconds / 60;

    await admin
      .from("speakers")
      .update({
        video_count_analyzed: completedJobs.length,
        transcribed_minutes: Math.round(transcribedMinutes * 10) / 10,
      })
      .eq("id", speaker_id);

    // ── Mark import complete ──────────────────────────────────────────────
    await admin
      .from("channel_imports")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", import_id);

    console.log(
      `[${import_id}] Embedding complete — ${rows.length} chunks, ` +
        `speaker ${speaker_id}, ${Math.round(transcribedMinutes)} min transcribed`,
    );

    return jsonOk({
      import_id,
      speaker_id,
      chunks_embedded: rows.length,
      jobs_processed: completedJobs.length,
      transcribed_minutes: Math.round(transcribedMinutes * 10) / 10,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return await fail(msg);
  }
});

// ---------------------------------------------------------------------------
// Sample evenly from an array (takes every Nth item to get targetCount)
// ---------------------------------------------------------------------------

function sampleEvenly<T>(arr: T[], targetCount: number): T[] {
  if (arr.length <= targetCount) return arr;
  const step = arr.length / targetCount;
  const result: T[] = [];
  for (let i = 0; i < targetCount; i++) {
    result.push(arr[Math.floor(i * step)]);
  }
  return result;
}
