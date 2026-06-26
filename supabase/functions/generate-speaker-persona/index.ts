/**
 * generate-speaker-persona
 * Internal function — synthesises all completed transcripts into a speaker
 * persona via GPT-4o, then inserts a new row into the speakers table.
 *
 * Flow:
 *   1. Set status = 'analyzing_style'
 *   2. Fetch all complete transcript_jobs → concatenate text
 *   3. Call OpenAI GPT-4o with the persona system prompt
 *   4. Parse + validate PersonaProfile JSON
 *   5. Set status = 'generating_persona'
 *   6. Insert speaker row
 *   7. Write resulting_speaker_id back to channel_imports
 *   8. Trigger embed-speech-samples
 */

import {
  CORS_HEADERS,
  createAdminClient,
  invokeFunction,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

import type {
  CategoryId,
  ChannelImport,
  GeneratePersonaRequest,
  PersonaProfile,
  TranscriptJob,
} from "../_shared/import-types.ts";

import { generatePersona } from "../_shared/openai.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// Map AI-suggested category names to CategoryId values
const CATEGORY_MAP: Record<string, CategoryId> = {
  motivation: "motivation",
  sales: "sales",
  influence: "influence",
  leadership: "leadership",
  storytelling: "storytelling",
  authority: "authority",
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let body: GeneratePersonaRequest;
  try {
    body = await req.json() as GeneratePersonaRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { import_id } = body;
  if (!import_id) return jsonError("import_id is required", 400);

  const admin = createAdminClient();

  // ── Load import row ───────────────────────────────────────────────────────
  const { data: importRow, error: importErr } = await admin
    .from("channel_imports")
    .select("*")
    .eq("id", import_id)
    .single<ChannelImport>();

  if (importErr || !importRow) {
    return jsonError(`Import not found: ${import_id}`, 404);
  }

  // Idempotency guard
  if (
    ["generating_persona", "embedding", "complete"].includes(importRow.status)
  ) {
    return jsonOk({ skipped: true, status: importRow.status });
  }

  async function fail(msg: string): Promise<Response> {
    console.error(`[${import_id}] generate-speaker-persona failed:`, msg);
    await admin
      .from("channel_imports")
      .update({ status: "failed", error_message: msg })
      .eq("id", import_id);
    return jsonError(msg, 500);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return await fail("OPENAI_API_KEY not configured");

  // ── Set status = 'analyzing_style' ────────────────────────────────────────
  await admin
    .from("channel_imports")
    .update({ status: "analyzing_style" })
    .eq("id", import_id);

  try {
    // ── Fetch all complete transcripts ──────────────────────────────────────
    const { data: jobs, error: jobsErr } = await admin
      .from("transcript_jobs")
      .select("transcript_text, duration_seconds, title")
      .eq("import_id", import_id)
      .eq("status", "complete")
      .not("transcript_text", "is", null);

    if (jobsErr) return await fail(`Failed to fetch transcripts: ${jobsErr.message}`);

    const transcriptJobs = (jobs ?? []) as Pick<
      TranscriptJob,
      "transcript_text" | "duration_seconds" | "title"
    >[];

    if (transcriptJobs.length === 0) {
      return await fail("No completed transcripts found for this import");
    }

    // ── Concatenate transcripts with section headers ──────────────────────
    const totalDurationSeconds = transcriptJobs.reduce(
      (sum, j) => sum + (j.duration_seconds ?? 0),
      0,
    );

    const concatenated = transcriptJobs
      .map((j, i) => `[Session ${i + 1}: ${j.title ?? "Untitled"}]\n${j.transcript_text ?? ""}`)
      .join("\n\n---\n\n");

    console.log(
      `[${import_id}] Generating persona from ${transcriptJobs.length} transcripts ` +
        `(${Math.round(totalDurationSeconds / 60)} min, ` +
        `${concatenated.split(/\s+/).length.toLocaleString()} words)`,
    );

    // ── Call GPT-4o ───────────────────────────────────────────────────────
    const persona = await generatePersona(concatenated, openaiKey, {
      nameOverride: importRow.custom_name,
      traitOverride: importRow.custom_trait,
      targetCategory: importRow.target_category_id,
    });

    // ── Set status = 'generating_persona' ─────────────────────────────────
    await admin
      .from("channel_imports")
      .update({ status: "generating_persona" })
      .eq("id", import_id);

    // ── Resolve category_id ────────────────────────────────────────────────
    const resolvedCategory: CategoryId =
      importRow.target_category_id ??
      CATEGORY_MAP[persona.category_suggestion] ??
      "motivation";

    // ── Detect detected name for monogram (from source metadata if available) ─
    const sourceMeta = importRow.source_metadata as Record<string, unknown> | null;
    const detectedName = (sourceMeta?.title as string) ?? persona.name;

    // ── Insert speaker row ─────────────────────────────────────────────────
    const { data: speaker, error: speakerInsertErr } = await admin
      .from("speakers")
      .insert({
        name: persona.name || detectedName,
        monogram: persona.monogram,
        specialty: persona.specialty,
        signature_trait: persona.signature_trait,
        bio: persona.bio,
        ideal_wpm_min: persona.ideal_wpm_min,
        ideal_wpm_max: persona.ideal_wpm_max,
        ideal_pause_frequency: persona.ideal_pause_frequency,
        energy_profile: persona.energy_profile,
        famous_speeches: [],
        learnings: persona.learnings,
        // New import-specific columns
        source_type: "imported",
        source_url: importRow.source_url,
        source_user_id: importRow.user_id,
        signature_phrases: persona.signature_phrases,
        common_themes: persona.common_themes,
        persuasion_techniques: persona.persuasion_techniques,
        style_traits: persona.style_traits,
        perfect_for: persona.perfect_for,
        category_id: resolvedCategory,
        sort_order: 9999, // imported speakers appear at the end
      })
      .select("id")
      .single<{ id: string }>();

    if (speakerInsertErr || !speaker) {
      return await fail(
        `Failed to insert speaker: ${speakerInsertErr?.message ?? "Unknown error"}`,
      );
    }

    // ── Write speaker ID back to channel_imports ───────────────────────────
    await admin
      .from("channel_imports")
      .update({ resulting_speaker_id: speaker.id })
      .eq("id", import_id);

    // ── Trigger embed-speech-samples ──────────────────────────────────────
    EdgeRuntime.waitUntil(
      invokeFunction("embed-speech-samples", {
        speaker_id: speaker.id,
        import_id,
      }).catch(
        (err: unknown) =>
          console.error(
            `[${import_id}] Failed to trigger embed-speech-samples:`,
            err instanceof Error ? err.message : String(err),
          ),
      ),
    );

    console.log(
      `[${import_id}] Persona generated — speaker ${speaker.id} (${persona.name})`,
    );

    return jsonOk({
      import_id,
      speaker_id: speaker.id,
      speaker_name: persona.name,
      category: resolvedCategory,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return await fail(msg);
  }
});
