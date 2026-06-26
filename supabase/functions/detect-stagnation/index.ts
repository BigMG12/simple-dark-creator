/**
 * detect-stagnation
 *
 * Daily cron job (06:00 UTC). For each user with recent activity, check the
 * rolling 7-day average of every tracked metric vs the previous 7-day window
 * over a 14-day lookback. If a metric has changed less than 3% in absolute
 * relative terms across that window, flag it as stagnant — unless an active
 * stagnation_alert already exists for that (user, metric).
 *
 * Body: optional { user_id?: string } — if provided, runs only for that user.
 */

import {
  CORS_HEADERS,
  createAdminClient,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

interface MetricSpec {
  key: string;          // metric name in analyses table
  label: string;        // human label
  invert?: boolean;     // true = lower is better (filler)
  drillSkillTag: string; // matches drills.target_skill
}

const METRICS: MetricSpec[] = [
  { key: "wpm",                     label: "WPM",                 drillSkillTag: "pace" },
  { key: "clarity_score",           label: "Clarity",             drillSkillTag: "clarity" },
  { key: "energy_variance_score",   label: "Energy variance",     drillSkillTag: "energy" },
  { key: "pause_mastery_score",     label: "Pause mastery",       drillSkillTag: "pause" },
  { key: "vocabulary_depth_score",  label: "Vocabulary depth",    drillSkillTag: "vocabulary" },
  { key: "filler_density_per_min",  label: "Filler density",      invert: true, drillSkillTag: "filler" },
];

const STAGNATION_THRESHOLD_PCT = 3; // <3% movement counts as stagnant

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const admin = createAdminClient();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUserId: string | undefined = body?.user_id;

    // 1. Load eligible users (active in last 14 days)
    const sinceIso = new Date(Date.now() - 14 * 86400_000).toISOString();
    let usersQuery = admin
      .from("recordings")
      .select("user_id")
      .gte("created_at", sinceIso);
    if (targetUserId) usersQuery = usersQuery.eq("user_id", targetUserId);

    const { data: usersRaw, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;

    const userIds = Array.from(new Set((usersRaw ?? []).map((r) => r.user_id as string)));
    let createdCount = 0;

    for (const userId of userIds) {
      // 2. Load analyses for this user across the 14-day window
      const { data: analyses, error: aErr } = await admin
        .from("analyses")
        .select(
          "created_at, wpm, clarity_score, energy_variance_score, pause_mastery_score, vocabulary_depth_score, filler_density_per_min, recording_id, recordings!inner(user_id)",
        )
        .eq("recordings.user_id", userId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true });
      if (aErr) {
        console.error("[detect-stagnation] analyses error", aErr);
        continue;
      }

      const rows = analyses ?? [];
      if (rows.length < 4) continue; // need a meaningful sample

      const now = Date.now();
      const sevenAgo = now - 7 * 86400_000;

      // 3. Active alerts already on file (skip duplicates)
      const { data: activeAlerts } = await admin
        .from("stagnation_alerts")
        .select("metric")
        .eq("user_id", userId)
        .eq("status", "active");
      const activeMetrics = new Set((activeAlerts ?? []).map((a) => a.metric as string));

      for (const m of METRICS) {
        if (activeMetrics.has(m.key)) continue;

        const recent: number[] = [];
        const prior: number[] = [];
        for (const r of rows) {
          const v = (r as Record<string, unknown>)[m.key];
          if (typeof v !== "number") continue;
          const ts = new Date(r.created_at as string).getTime();
          if (ts >= sevenAgo) recent.push(v);
          else prior.push(v);
        }
        if (recent.length < 2 || prior.length < 2) continue;

        const recentAvg = recent.reduce((s, x) => s + x, 0) / recent.length;
        const priorAvg = prior.reduce((s, x) => s + x, 0) / prior.length;
        if (priorAvg === 0) continue;

        const deltaPct = Math.abs(((recentAvg - priorAvg) / priorAvg) * 100);
        if (deltaPct >= STAGNATION_THRESHOLD_PCT) continue;

        // 4. Match a drill targeting this metric
        const { data: drill } = await admin
          .from("drills")
          .select("id, title")
          .contains("target_skills", [m.drillSkillTag])
          .limit(1)
          .maybeSingle();

        // 5. Insert alert
        const { error: insertErr } = await admin.from("stagnation_alerts").insert({
          user_id: userId,
          metric: m.key,
          metric_label: m.label,
          recent_avg: recentAvg,
          prior_avg: priorAvg,
          delta_percent: deltaPct,
          days_stagnant: 14,
          suggested_drill_id: drill?.id ?? null,
          suggested_drill_title: drill?.title ?? null,
          status: "active",
          created_at: new Date().toISOString(),
        });

        if (insertErr) {
          console.error("[detect-stagnation] insert error", insertErr);
          continue;
        }
        createdCount += 1;
      }
    }

    return jsonOk({ ok: true, users_scanned: userIds.length, alerts_created: createdCount });
  } catch (err) {
    console.error("[detect-stagnation] fatal", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
