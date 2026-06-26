/**
 * generate-weekly-review
 *
 * Sundays at 23:00 UTC. For every active user (recording in last 14 days),
 * aggregate the past Mon-Sun, call GPT-4o for a 3-paragraph coaching review,
 * then persist into weekly_reviews + drop a notification.
 *
 * Body (optional):
 *   { user_id?: string, week_start?: 'YYYY-MM-DD' }
 */

import {
  CORS_HEADERS,
  createAdminClient,
  getEnvOrThrow,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

interface MetricsSummary {
  avg_overall_score: number | null;
  avg_wpm: number | null;
  avg_clarity: number | null;
  avg_energy: number | null;
  avg_pause: number | null;
  avg_vocab: number | null;
  avg_filler: number | null;
  session_count: number;
  total_minutes: number;
  vs_previous_week: Record<string, number>; // delta percent
  top_improvement: { metric: string; delta_percent: number } | null;
  biggest_plateau: { metric: string; delta_percent: number } | null;
}

const SYSTEM_PROMPT = `You are the user's personal speaking coach, writing their weekly review. Tone: elite, warm, direct, no fluff, no emojis. Treat them like a pro in training.

Structure (exactly 3 paragraphs):
P1 — What improved this week (be specific with numbers).
P2 — What plateaued or regressed, and why it might have happened.
P3 — Specific focus for next week (recommend one drill with reasoning), close with a motivational line that feels earned, not generic.

Return ONLY valid JSON matching:
{
  "review_body": "three paragraphs joined by \\n\\n",
  "highlights": ["...", "..."],
  "plateaus": ["...", "..."],
  "recommended_drill_id": "uuid or null",
  "motivational_close": "single line"
}`;

function startOfWeek(d: Date): Date {
  // Monday 00:00 UTC of the week containing `d`
  const c = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (c.getUTCDay() + 6) % 7; // 0 = Mon
  c.setUTCDate(c.getUTCDate() - day);
  return c;
}

function pctDelta(curr: number | null, prev: number | null): number {
  if (curr == null || prev == null || prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

async function aggregateWeek(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<{ summary: MetricsSummary; snippets: string[] }> {
  const prevStart = new Date(weekStart.getTime() - 7 * 86400_000);

  const { data: thisWeek } = await admin
    .from("analyses")
    .select(
      "overall_score, wpm, clarity_score, energy_variance_score, pause_mastery_score, vocabulary_depth_score, filler_density_per_min, transcript, recordings!inner(user_id, duration_seconds)",
    )
    .eq("recordings.user_id", userId)
    .gte("created_at", weekStart.toISOString())
    .lt("created_at", weekEnd.toISOString());

  const { data: lastWeek } = await admin
    .from("analyses")
    .select(
      "overall_score, wpm, clarity_score, energy_variance_score, pause_mastery_score, vocabulary_depth_score, filler_density_per_min, transcript, recordings!inner(user_id)",
    )
    .eq("recordings.user_id", userId)
    .gte("created_at", prevStart.toISOString())
    .lt("created_at", weekStart.toISOString());

  const tw = thisWeek ?? [];
  const lw = lastWeek ?? [];

  const avg = (rows: any[], k: string) => {
    const vals = rows.map((r) => (r as Record<string, unknown>)[k]).filter((v): v is number => typeof v === "number");
    if (!vals.length) return null;
    return Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10;
  };
  const totalSeconds = tw.reduce((s, r) => {
    // @ts-ignore embed
    const d = r.recordings?.duration_seconds;
    return s + (typeof d === "number" ? d : 0);
  }, 0);

  const curr = {
    avg_overall_score: avg(tw, "overall_score"),
    avg_wpm:           avg(tw, "wpm"),
    avg_clarity:       avg(tw, "clarity_score"),
    avg_energy:        avg(tw, "energy_variance_score"),
    avg_pause:         avg(tw, "pause_mastery_score"),
    avg_vocab:         avg(tw, "vocabulary_depth_score"),
    avg_filler:        avg(tw, "filler_density_per_min"),
  };
  const prev = {
    avg_overall_score: avg(lw, "overall_score"),
    avg_wpm:           avg(lw, "wpm"),
    avg_clarity:       avg(lw, "clarity_score"),
    avg_energy:        avg(lw, "energy_variance_score"),
    avg_pause:         avg(lw, "pause_mastery_score"),
    avg_vocab:         avg(lw, "vocabulary_depth_score"),
    avg_filler:        avg(lw, "filler_density_per_min"),
  };

  // For filler we invert sign so "improvement" = decrease
  const deltas: Record<string, number> = {
    overall_score: pctDelta(curr.avg_overall_score, prev.avg_overall_score),
    wpm:           pctDelta(curr.avg_wpm,           prev.avg_wpm),
    clarity:       pctDelta(curr.avg_clarity,       prev.avg_clarity),
    energy:        pctDelta(curr.avg_energy,        prev.avg_energy),
    pause:         pctDelta(curr.avg_pause,         prev.avg_pause),
    vocab:         pctDelta(curr.avg_vocab,         prev.avg_vocab),
    filler:       -pctDelta(curr.avg_filler,        prev.avg_filler),
  };

  let topImp: { metric: string; delta_percent: number } | null = null;
  let plateau: { metric: string; delta_percent: number } | null = null;
  for (const [m, d] of Object.entries(deltas)) {
    if (!topImp || d > topImp.delta_percent) topImp = { metric: m, delta_percent: d };
    if (!plateau || Math.abs(d) < Math.abs(plateau.delta_percent)) plateau = { metric: m, delta_percent: d };
  }

  const snippets = tw
    .map((r) => (typeof r.transcript === "string" ? r.transcript.slice(0, 240) : null))
    .filter((s): s is string => !!s)
    .slice(0, 5);

  return {
    summary: {
      ...curr,
      session_count: tw.length,
      total_minutes: Math.round(totalSeconds / 60),
      vs_previous_week: deltas,
      top_improvement: topImp,
      biggest_plateau: plateau,
    },
    snippets,
  };
}

async function callOpenAI(
  apiKey: string,
  summary: MetricsSummary,
  mentorName: string | null,
  snippets: string[],
): Promise<Record<string, unknown>> {
  const userPrompt = `Week data: ${JSON.stringify(summary, null, 2)}
User's mentor: ${mentorName ?? "none selected"}
Recent recordings snippets:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join("\n")}`;

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI: empty content");
  return JSON.parse(content);
}

const NUDGE_FOR_INACTIVE = {
  review_body:
    "You didn't record this week — that's the only thing the data is telling me.\n\nMomentum compounds; silence does the opposite. One short session resets the trend.\n\nNext week: a single 60-second recording on any topic. Build the streak first, refine the craft after.",
  highlights: [],
  plateaus: ["No sessions logged"],
  recommended_drill_id: null,
  motivational_close: "Show up. The rest follows.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const admin = createAdminClient();
    const apiKey = getEnvOrThrow("OPENAI_API_KEY");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const weekStart = body?.week_start
      ? startOfWeek(new Date(body.week_start))
      : startOfWeek(new Date(Date.now() - 1 * 86400_000)); // last week's Monday
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000);

    // Eligible users: any recording in the last 14 days
    const since = new Date(weekStart.getTime() - 7 * 86400_000).toISOString();
    let q = admin.from("recordings").select("user_id").gte("created_at", since);
    if (body?.user_id) q = q.eq("user_id", body.user_id);
    const { data: usersRaw, error: usersErr } = await q;
    if (usersErr) throw usersErr;

    const userIds = Array.from(new Set((usersRaw ?? []).map((r) => r.user_id as string)));
    let createdCount = 0;

    for (const userId of userIds) {
      // Skip if already generated for this week
      const { data: existing } = await admin
        .from("weekly_reviews")
        .select("id")
        .eq("user_id", userId)
        .eq("week_start", weekStart.toISOString().slice(0, 10))
        .maybeSingle();
      if (existing) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("id, preferred_mentor_id, speakers:preferred_mentor_id(name)")
        .eq("id", userId)
        .maybeSingle();
      // @ts-ignore embed shape
      const mentorName: string | null = profile?.speakers?.name ?? null;

      const { summary, snippets } = await aggregateWeek(admin, userId, weekStart, weekEnd);

      let review: Record<string, unknown>;
      if (summary.session_count === 0) {
        review = NUDGE_FOR_INACTIVE;
      } else {
        try {
          review = await callOpenAI(apiKey, summary, mentorName, snippets);
        } catch (err) {
          console.error("[generate-weekly-review] OpenAI error", err);
          continue;
        }
      }

      const { error: insertErr } = await admin.from("weekly_reviews").insert({
        user_id: userId,
        week_start: weekStart.toISOString().slice(0, 10),
        week_end: new Date(weekEnd.getTime() - 1).toISOString().slice(0, 10),
        review_body: review.review_body,
        highlights: review.highlights ?? [],
        plateaus: review.plateaus ?? [],
        recommended_drill_id: review.recommended_drill_id ?? null,
        motivational_close: review.motivational_close ?? null,
        metrics_summary: summary,
        created_at: new Date().toISOString(),
      });
      if (insertErr) {
        console.error("[generate-weekly-review] insert error", insertErr);
        continue;
      }

      await admin.from("notifications").insert({
        user_id: userId,
        kind: "weekly_review",
        title: "Your weekly review is ready",
        body: typeof review.motivational_close === "string"
          ? review.motivational_close
          : "Open the dashboard to read your coach's notes.",
        payload: { week_start: weekStart.toISOString().slice(0, 10) },
        created_at: new Date().toISOString(),
      });

      createdCount += 1;
    }

    return jsonOk({
      ok: true,
      week_start: weekStart.toISOString().slice(0, 10),
      users_scanned: userIds.length,
      reviews_created: createdCount,
    });
  } catch (err) {
    console.error("[generate-weekly-review] fatal", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
