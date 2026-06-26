/**
 * generate-daily-insight
 *
 * Daily at 05:00 UTC. For every user with `ai_coach_insights_enabled = true`,
 * pull the last 3 recordings + analyses and ask gpt-4o-mini for a single,
 * pointed sentence. Cache it on profiles.daily_insight_cache so the dashboard
 * never makes an AI call on load.
 *
 * Body (optional): { user_id?: string, force?: boolean }
 */

import {
  CORS_HEADERS,
  createAdminClient,
  getEnvOrThrow,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are the user's speaking coach. Given their last 3 recordings (metrics + brief snippets), respond with ONE sentence (max 22 words) that points to the single most useful thing for them to focus on today. No emojis, no preamble, no quotation marks. Direct and warm.";

interface RecordingLite {
  created_at: string;
  overall_score: number | null;
  wpm: number | null;
  clarity_score: number | null;
  filler_density_per_min: number | null;
  transcript: string | null;
}

async function callOpenAI(apiKey: string, recordings: RecordingLite[]): Promise<string> {
  const userPrompt = `Last 3 recordings (newest first):\n${
    recordings
      .map(
        (r, i) =>
          `[${i + 1}] ${r.created_at} — overall ${r.overall_score ?? "?"}, wpm ${r.wpm ?? "?"}, clarity ${r.clarity_score ?? "?"}, filler/min ${r.filler_density_per_min ?? "?"}\nSnippet: ${(r.transcript ?? "").slice(0, 220)}`,
      )
      .join("\n\n")
  }`;

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 80,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI: empty content");
  return text.trim().replace(/^["']|["']$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const admin = createAdminClient();
    const apiKey = getEnvOrThrow("OPENAI_API_KEY");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const today = new Date().toISOString().slice(0, 10);

    let q = admin
      .from("profiles")
      .select("id, daily_insight_cached_date")
      .eq("ai_coach_insights_enabled", true);
    if (body?.user_id) q = q.eq("id", body.user_id);

    const { data: profiles, error: pErr } = await q;
    if (pErr) throw pErr;

    let updated = 0;
    let skipped = 0;

    for (const p of profiles ?? []) {
      if (!body?.force && p.daily_insight_cached_date === today) {
        skipped += 1;
        continue;
      }

      const { data: recs } = await admin
        .from("analyses")
        .select(
          "created_at, overall_score, wpm, clarity_score, filler_density_per_min, transcript, recordings!inner(user_id)",
        )
        .eq("recordings.user_id", p.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!recs || recs.length === 0) {
        await admin
          .from("profiles")
          .update({
            daily_insight_cache:
              "Record one short session today to start the streak — the data we'll get from it is more valuable than any tip I could give now.",
            daily_insight_cached_date: today,
          })
          .eq("id", p.id);
        updated += 1;
        continue;
      }

      try {
        const insight = await callOpenAI(apiKey, recs as RecordingLite[]);
        await admin
          .from("profiles")
          .update({
            daily_insight_cache: insight,
            daily_insight_cached_date: today,
          })
          .eq("id", p.id);
        updated += 1;
      } catch (err) {
        console.error("[generate-daily-insight] OpenAI error", p.id, err);
      }
    }

    return jsonOk({ ok: true, updated, skipped, total: profiles?.length ?? 0 });
  } catch (err) {
    console.error("[generate-daily-insight] fatal", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
