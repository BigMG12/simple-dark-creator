/**
 * analyze-prosody
 *
 * Fire-and-forget by analyze-recording.
 * Calls Hume Batch API (Expression Measurement, prosody model),
 * polls job, parses utterances, saves prosody_data + prosody_radar.
 * Then triggers enrich-sentences-with-prosody.
 */

import {
  createAdminClient,
  jsonError,
  jsonOk,
  CORS_HEADERS,
} from "../_shared/supabase-admin.ts";

const HUME_BASE = "https://api.hume.ai/v0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  let analysisId: string | undefined;
  const admin = createAdminClient();

  try {
    const body = await req.json();
    const { recording_id, analysis_id } = body;
    analysisId = analysis_id;

    if (!recording_id || !analysis_id) {
      return jsonError("Missing recording_id or analysis_id", 400);
    }

    const humeKey = Deno.env.get("HUME_API_KEY");
    if (!humeKey) {
      await markFailed(admin, analysis_id, "HUME_API_KEY not set");
      return jsonError("HUME_API_KEY not configured", 500);
    }

    // 1. Fetch recording
    const { data: recording, error: recErr } = await admin
      .from("recordings")
      .select("id, audio_url, duration_seconds")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      console.error("[analyze-prosody] Recording fetch failed:", recErr);
      await markFailed(admin, analysis_id, "Recording not found");
      return jsonError("Recording not found", 404);
    }

    if (!recording.audio_url) {
      await markFailed(admin, analysis_id, "No audio URL");
      return jsonError("Recording has no audio URL", 400);
    }

    if (recording.duration_seconds && recording.duration_seconds < 3) {
      await admin
        .from("analyses")
        .update({ prosody_status: "skipped" })
        .eq("id", analysis_id);
      return jsonOk({ skipped: true, reason: "Too short" });
    }

    // 2. Mark processing
    await admin
      .from("analyses")
      .update({ prosody_status: "processing" })
      .eq("id", analysis_id);

    // 3. Submit Hume Batch job
    const audioUrl = await ensurePublicUrl(recording.audio_url, admin);

    const submitResponse = await fetch(`${HUME_BASE}/batch/jobs`, {
      method: "POST",
      headers: {
        "X-Hume-Api-Key": humeKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        models: {
          prosody: { granularity: "utterance" },
        },
        urls: [audioUrl],
      }),
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error("[analyze-prosody] Hume submit failed:", errText);
      await markFailed(
        admin,
        analysis_id,
        `Hume submit: ${submitResponse.status}`,
      );
      return jsonError("Hume submit failed", 500);
    }

    const { job_id } = await submitResponse.json();
    console.log(`[analyze-prosody] Hume job submitted: ${job_id}`);

    // 4. Poll up to 90s
    const predictions = await pollHumeJob(humeKey, job_id, 90);
    if (!predictions) {
      await markFailed(admin, analysis_id, "Hume job timeout");
      return jsonError("Hume job timeout", 500);
    }

    // 5. Parse
    const { prosody_data, prosody_radar } = parseHumePredictions(predictions);

    // 6. Save
    const { error: updateErr } = await admin
      .from("analyses")
      .update({
        prosody_data,
        prosody_radar,
        prosody_status: "complete",
      })
      .eq("id", analysis_id);

    if (updateErr) {
      console.error("[analyze-prosody] Save failed:", updateErr);
      return jsonError("Failed to save prosody", 500);
    }

    console.log(
      `[analyze-prosody] Prosody saved for analysis ${analysis_id}`,
    );

    // 7. Fire-and-forget enrich
    const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-sentences-with-prosody`;
    fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ analysis_id }),
    }).catch((err) => {
      console.error("[analyze-prosody] Enrich trigger failed:", err);
    });

    return jsonOk({
      job_id,
      utterances_count: prosody_data.utterances.length,
    });
  } catch (err) {
    console.error("[analyze-prosody] Fatal error:", err);
    if (analysisId) {
      await markFailed(
        admin,
        analysisId,
        err instanceof Error ? err.message : "Unknown error",
      );
    }
    return jsonError(
      err instanceof Error ? err.message : "Unknown error",
      500,
    );
  }
});

// ───────────────────────────────────────────────────────────

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  reason: string,
) {
  await admin
    .from("analyses")
    .update({ prosody_status: "failed" })
    .eq("id", analysisId);
  console.error(`[analyze-prosody] Marked failed: ${reason}`);
}

async function ensurePublicUrl(
  url: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string> {
  if (url.startsWith("http")) return url;
  const { data } = await admin.storage
    .from("recordings")
    .createSignedUrl(url, 3600);
  if (!data?.signedUrl) throw new Error("Failed to generate signed URL");
  return data.signedUrl;
}

async function pollHumeJob(
  apiKey: string,
  jobId: string,
  maxSeconds: number,
): Promise<unknown[] | null> {
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < maxSeconds) {
    await sleep(2000);

    const statusResponse = await fetch(`${HUME_BASE}/batch/jobs/${jobId}`, {
      headers: { "X-Hume-Api-Key": apiKey },
    });

    if (!statusResponse.ok) {
      console.error(
        "[pollHumeJob] Status check failed:",
        statusResponse.status,
      );
      continue;
    }

    const jobStatus = await statusResponse.json();
    const state = jobStatus.state?.status;
    console.log(`[pollHumeJob] Job ${jobId} state: ${state}`);

    if (state === "COMPLETED") {
      const predictionsResponse = await fetch(
        `${HUME_BASE}/batch/jobs/${jobId}/predictions`,
        { headers: { "X-Hume-Api-Key": apiKey } },
      );
      if (!predictionsResponse.ok) {
        console.error("[pollHumeJob] Predictions fetch failed");
        return null;
      }
      return await predictionsResponse.json();
    }

    if (state === "FAILED") {
      console.error("[pollHumeJob] Job failed:", jobStatus);
      return null;
    }
  }

  console.warn(`[pollHumeJob] Timeout after ${maxSeconds}s`);
  return null;
}

interface ParsedUtterance {
  text: string;
  start_seconds: number;
  end_seconds: number;
  emotions: { name: string; score: number }[];
}

function parseHumePredictions(predictions: unknown[]): {
  prosody_data: { utterances: ParsedUtterance[] };
  prosody_radar: Record<string, number>;
} {
  const utterances: ParsedUtterance[] = [];

  try {
    // deno-lint-ignore no-explicit-any
    const predictionsArray = (predictions as any[])[0]?.results?.predictions || [];
    for (const pred of predictionsArray) {
      const prosody = pred.models?.prosody;
      if (!prosody) continue;
      const groupedPreds = prosody.grouped_predictions || [];
      for (const group of groupedPreds) {
        const preds = group.predictions || [];
        // deno-lint-ignore no-explicit-any
        for (const p of preds as any[]) {
          utterances.push({
            text: p.text || "",
            start_seconds: p.time?.begin ?? 0,
            end_seconds: p.time?.end ?? 0,
            emotions: (p.emotions || []).map((e: { name: string; score: number }) => ({
              name: e.name,
              score: e.score,
            })),
          });
        }
      }
    }
  } catch (err) {
    console.error("[parseHumePredictions] Parse error:", err);
  }

  const KEY_EMOTIONS = [
    "Confidence",
    "Excitement",
    "Determination",
    "Calmness",
    "Doubt",
    "Tiredness",
    "Awkwardness",
    "Boredom",
  ];

  const radar: Record<string, number> = {};
  for (const emotion of KEY_EMOTIONS) {
    const scores: number[] = [];
    for (const utt of utterances) {
      const found = utt.emotions.find((e) => e.name === emotion);
      if (found) scores.push(found.score);
    }
    radar[emotion.toLowerCase()] = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
      : 0;
  }
  // alias for radar UI
  radar.energy = radar.excitement;

  return {
    prosody_data: { utterances },
    prosody_radar: radar,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
