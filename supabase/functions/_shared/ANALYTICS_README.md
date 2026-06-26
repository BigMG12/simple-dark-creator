# Progress analytics & weekly reviews

This bundle adds: 3 RPCs, 1 trigger extension, 3 edge functions, and a pg_cron schedule.
**Cloud is not enabled yet** — these files are written against an assumed schema.
Apply once Cloud + schema are ready.

## Files

| File | Purpose |
|---|---|
| `supabase/migrations-staging/010_progress_analytics.sql` | RPCs (`get_progress_overview`, `get_activity_heatmap`, `get_before_after_comparison`), helpers (`pct_delta`, `normalize_wpm`), `handle_analysis_insert_progress` trigger, pg_cron schedule for the 3 jobs. |
| `supabase/functions/detect-stagnation/index.ts` | 14-day rolling-avg comparison per metric per user → inserts `stagnation_alerts`. |
| `supabase/functions/generate-weekly-review/index.ts` | Mon–Sun aggregation → GPT-4o → `weekly_reviews` + `notifications`. |
| `supabase/functions/generate-daily-insight/index.ts` | Last-3-recordings → gpt-4o-mini → `profiles.daily_insight_cache`. |

## Required schema

Tables expected (column names referenced in the code):

```
recordings(id, user_id, duration_seconds, created_at, ...)
analyses(id, recording_id, overall_score, wpm, clarity_score,
         energy_variance_score, pause_mastery_score, vocabulary_depth_score,
         filler_density_per_min, transcript, created_at)
drills(id, title, target_skills text[])             -- target_skills used by detect-stagnation
drill_completions(user_id, drill_id, completed_at)

profiles(id, preferred_mentor_id, ai_coach_insights_enabled bool default true,
         daily_insight_cache text, daily_insight_cached_date date)
speakers(id, name, ideal_wpm_min, ideal_wpm_max)

progress_snapshots(user_id, snapshot_date date, sessions_count, total_seconds,
                   avg_overall_score, avg_wpm, avg_clarity_score,
                   avg_energy_variance_score, avg_pause_mastery_score,
                   avg_vocabulary_depth_score, avg_filler_density_per_min,
                   updated_at,
                   primary key(user_id, snapshot_date))

personal_records(user_id, metric text, value numeric, recording_id uuid,
                 achieved_at timestamptz, primary key(user_id, metric))

user_goals(id, user_id, title, target_metric text, target_value numeric,
           current_value numeric, status text default 'active',
           achieved_at timestamptz, deadline date, updated_at, created_at)

stagnation_alerts(id, user_id, metric, metric_label, recent_avg, prior_avg,
                  delta_percent, days_stagnant, suggested_drill_id,
                  suggested_drill_title, status default 'active', created_at)

weekly_reviews(id, user_id, week_start date, week_end date, review_body,
               highlights jsonb, plateaus jsonb, recommended_drill_id,
               motivational_close, metrics_summary jsonb, created_at,
               unique(user_id, week_start))

achievements_log(id, user_id, kind text, ref_id uuid, payload jsonb, created_at)
notifications(id, user_id, kind, title, body, payload jsonb, read_at, created_at)
```

RLS on every user-scoped table: `user_id = auth.uid()` for select; service-role
inserts everywhere else.

## Trigger wiring

`handle_analysis_insert_progress` runs **after insert on analyses**. If you have
a v1 trigger handling XP/streaks, leave it; this trigger is additive (separate
trigger name `trg_analyses_progress`).

## Cron setup (pg_cron + pg_net)

The migration registers three jobs but uses two database GUCs that you must
set once per environment as superuser:

```sql
alter database postgres set app.functions_base_url = 'https://<PROJECT_REF>.supabase.co/functions/v1';
alter database postgres set app.service_role_key   = '<SERVICE_ROLE_KEY>';
```

Schedule:
- `detect-stagnation-daily` — every day 06:00 UTC
- `generate-weekly-review` — every Sunday 23:00 UTC
- `generate-daily-insight` — every day 05:00 UTC

To verify: `select * from cron.job;` and `select * from cron.job_run_details order by start_time desc limit 20;`.

## Secrets needed

- `OPENAI_API_KEY` — used by both `generate-weekly-review` (gpt-4o) and `generate-daily-insight` (gpt-4o-mini).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — auto-injected.

The frontend has not been wired to these RPCs yet. Once Cloud is on and the
schema applied, replace `MOCK_PROGRESS` consumers in `src/pages/Progress.tsx`
with `supabase.rpc('get_progress_overview', { p_user_id, p_time_range })` etc.

## Manual test (after deployment)

```bash
# One-off run for a single user
curl -X POST "$SUPABASE_URL/functions/v1/detect-stagnation" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>"}'

curl -X POST "$SUPABASE_URL/functions/v1/generate-weekly-review" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>"}'

curl -X POST "$SUPABASE_URL/functions/v1/generate-daily-insight" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>", "force": true}'
```
