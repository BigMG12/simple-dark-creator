# BIG SPEAKING — Import Pipeline Operations Runbook

This document explains what to watch in production, how the automated recovery
systems work, and what SQL queries to run in the Supabase Dashboard when
investigating incidents.

---

## Architecture at a glance

```
User POST /create-speaker-import-job
    │
    ▼ fire-and-forget
run-import-orchestrator   (fetches metadata, inserts transcript_jobs)
    │
    ▼ fire-and-forget
process-transcripts       (YouTube captions / Spotify / Whisper — loops ~5 min)
    │
    ▼ fire-and-forget
generate-speaker-persona  (GPT-4o → speakers row)
    │
    ▼ fire-and-forget
embed-speech-samples      (text-embedding-3-small → speech_embeddings)
    │
    ▼ sets status = 'complete'
DB trigger → notify-import-complete  (Resend email + achievements_log)
```

Every status transition writes a row to **`import_events`** (audit trail).

---

## Automated recovery systems

| System | Schedule | What it does |
|--------|----------|--------------|
| `stuck_import_recovery` cron (SQL) | Every 10 min at :00 | Finds imports stuck in any in-progress status for >15 min. `retry_count ≤ 3` → reset to `queued`. `retry_count > 3` → set `failed` with "exceeded retry limit". Writes `retry_attempted` or `failed_permanently` to `import_events`. |
| `poll_queued_imports` cron (SQL→pg_net) | Every 10 min at :05 | Calls `retry-stuck-imports` edge function, which finds `queued` imports older than 2 min and invokes `run-import-orchestrator` for each. Bridges the gap between DB state and Edge Function execution. |
| `monthly_quota_reset` cron | Daily 00:00 UTC | Resets `imports_this_month = 0` for all quota rows where the rolling 30-day window has expired. |
| `transcript_job_cleanup` cron | Sunday 02:00 UTC | Deletes `complete` transcript_jobs older than 90 days. Frees storage without losing audit data (import_events and channel_imports are kept). |

**Net effect:** a crashed Edge Function is detected and requeued within 15 minutes.
No manual intervention needed for transient failures.

---

## What to monitor

### 1. Failed imports rate
**Healthy:** < 5% of imports reach `failed` status.
**Alarming:** > 15% — likely an API key issue, OpenAI outage, or YouTube quota exhaustion.

Watch the `import_events` table for `failed_permanently` events, which indicate
imports that exceeded the retry limit (> 3 attempts).

### 2. Average completion time
**Healthy:** 3–10 min for YouTube channels (20 videos), 1–3 min for single videos.
**Alarming:** > 20 min — suggests stuck imports, Whisper latency spikes, or
OpenAI rate limiting.

### 3. OpenAI cost per import
**Typical costs** (as of 2025):
- `gpt-4o` persona generation: ~$0.005–$0.015 per import (80–250K tokens)
- `text-embedding-3-small`: ~$0.001 per import (100 chunks × ~500 tokens)
- **Total:** ~$0.006–$0.016 per import

Watch `embed-speech-samples` logs for chunk counts. If MAX_CHUNKS (currently 100)
is hit frequently, cost is capped but quality may degrade.

### 4. YouTube quota exhaustion
**Quota:** 10 000 units/day (default). Each channel import uses ~2–5 units.
Monitor `source_metadata` for `error_message LIKE '%quota%'`.

### 5. Stuck imports (> 30 min in-progress)
These are imports where both the Edge Function crash recovery AND the
`poll_queued_imports` cron have failed. Should be extremely rare.

---

## Supabase Dashboard SQL Queries

Open **SQL Editor** in the Supabase Dashboard and run these as needed.

---

### Q1 — Top 5 longest-running active imports

```sql
SELECT
  id,
  user_id,
  source_type,
  source_url,
  status,
  retry_count,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS age_minutes,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS stale_minutes
FROM public.channel_imports
WHERE status NOT IN ('complete', 'failed', 'cancelled')
ORDER BY created_at ASC
LIMIT 5;
```

---

### Q2 — Imports that failed in the last 24 hours

```sql
SELECT
  ci.id,
  ci.user_id,
  ci.source_type,
  ci.source_url,
  ci.error_message,
  ci.retry_count,
  ci.updated_at AS failed_at,
  ie.event_data ->> 'reason' AS failure_reason
FROM public.channel_imports ci
LEFT JOIN public.import_events ie
  ON ie.import_id = ci.id
  AND ie.event_type = 'failed_permanently'
WHERE ci.status = 'failed'
  AND ci.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY ci.updated_at DESC;
```

---

### Q3 — Permanently failed imports (exceeded retry limit)

```sql
SELECT
  ie.import_id,
  ie.event_data,
  ie.created_at AS permanently_failed_at,
  ci.user_id,
  ci.source_type,
  ci.source_url,
  ci.retry_count
FROM public.import_events ie
JOIN public.channel_imports ci ON ci.id = ie.import_id
WHERE ie.event_type = 'failed_permanently'
ORDER BY ie.created_at DESC
LIMIT 20;
```

---

### Q4 — Imports stuck in an in-progress state for > 15 minutes

```sql
SELECT
  id,
  user_id,
  source_type,
  status,
  retry_count,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS stuck_minutes
FROM public.channel_imports
WHERE status IN (
    'fetching_metadata',
    'fetching_transcripts',
    'transcribing_audio',
    'analyzing_style',
    'generating_persona',
    'embedding'
  )
  AND updated_at < NOW() - INTERVAL '15 minutes'
ORDER BY updated_at ASC;
```

---

### Q5 — Average completion time by source type (last 7 days)

```sql
SELECT
  source_type,
  COUNT(*)                                         AS total_completed,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (completed_at - created_at)) / 60
  )::NUMERIC, 1)                                   AS avg_minutes,
  ROUND(MIN(
    EXTRACT(EPOCH FROM (completed_at - created_at)) / 60
  )::NUMERIC, 1)                                   AS min_minutes,
  ROUND(MAX(
    EXTRACT(EPOCH FROM (completed_at - created_at)) / 60
  )::NUMERIC, 1)                                   AS max_minutes
FROM public.channel_imports
WHERE status = 'complete'
  AND completed_at > NOW() - INTERVAL '7 days'
  AND completed_at IS NOT NULL
GROUP BY source_type
ORDER BY avg_minutes DESC;
```

---

### Q6 — OpenAI usage estimate (embeddings chunks per import, last 30 days)

```sql
-- speech_embeddings rows ≈ chunks sent to text-embedding-3-small.
-- Cost ≈ chunks × 500 tokens × $0.00002 / 1K tokens = $0.00001 per chunk.
SELECT
  ci.id             AS import_id,
  ci.source_type,
  ci.user_id,
  COUNT(se.id)      AS chunks_embedded,
  ROUND(COUNT(se.id) * 0.00001, 4) AS estimated_embedding_cost_usd,
  ci.completed_at
FROM public.channel_imports ci
JOIN public.speech_embeddings se ON se.import_id = ci.id
WHERE ci.status = 'complete'
  AND ci.completed_at > NOW() - INTERVAL '30 days'
GROUP BY ci.id, ci.source_type, ci.user_id, ci.completed_at
ORDER BY ci.completed_at DESC
LIMIT 50;
```

---

### Q7 — Users near or at their monthly import quota

```sql
SELECT
  q.user_id,
  p.email,
  q.tier,
  q.imports_this_month,
  CASE q.tier WHEN 'pro' THEN 50 ELSE 5 END           AS monthly_limit,
  q.reset_at,
  ROUND(
    q.imports_this_month::NUMERIC /
    CASE q.tier WHEN 'pro' THEN 50 ELSE 5 END * 100, 0
  )                                                    AS pct_used
FROM public.user_speaker_imports_quota q
JOIN public.profiles p ON p.id = q.user_id
WHERE q.imports_this_month > 0
ORDER BY pct_used DESC
LIMIT 20;
```

---

### Q8 — Import event timeline for a specific import (debugging)

```sql
-- Replace 'YOUR-IMPORT-ID' with the actual UUID.
SELECT
  event_type,
  event_data,
  created_at,
  EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) AS seconds_since_prev
FROM public.import_events
WHERE import_id = 'YOUR-IMPORT-ID'
ORDER BY created_at;
```

---

### Q9 — Weekly import volume and success rate

```sql
SELECT
  DATE_TRUNC('week', created_at)::DATE  AS week_start,
  COUNT(*)                              AS total_imports,
  COUNT(*) FILTER (WHERE status = 'complete')  AS completed,
  COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'complete')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 1
  )                                     AS success_rate_pct
FROM public.channel_imports
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY week_start
ORDER BY week_start DESC;
```

---

### Q10 — pg_cron job run history (check if crons are firing)

```sql
-- Requires pg_cron extension enabled (Dashboard → Extensions → pg_cron).
SELECT
  j.jobname,
  r.start_time,
  r.end_time,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time))::INT AS duration_seconds,
  r.status,
  r.return_message
FROM cron.job j
JOIN cron.job_run_details r ON r.jobid = j.jobid
WHERE j.jobname IN (
    'stuck_import_recovery',
    'poll_queued_imports',
    'monthly_quota_reset',
    'transcript_job_cleanup'
  )
ORDER BY r.start_time DESC
LIMIT 40;
```

---

## Incident playbook

### Import is stuck for > 30 minutes

1. Run **Q4** to identify the import.
2. Run **Q8** with the `import_id` to see the event timeline.
3. Check Edge Function logs: Dashboard → Edge Functions → select the function → Logs.
4. If the import has `retry_count < 3`, manually reset it:
   ```sql
   UPDATE public.channel_imports
   SET status = 'queued', updated_at = NOW()
   WHERE id = 'YOUR-IMPORT-ID';
   ```
   The `poll_queued_imports` cron will pick it up within 5 minutes.
5. If `retry_count >= 3`, investigate the root cause before retrying:
   - Check `error_message` on the `channel_imports` row.
   - Check Supabase Edge Function logs for the specific error.
   - Check YouTube/Spotify/OpenAI API status pages.

### Failed imports spike (> 15%)

1. Run **Q2** to identify which source_type and error_message is failing.
2. Common causes:
   - **YouTube quota**: `quotaExceeded` in error_message → wait for quota reset or apply for increase.
   - **OpenAI rate limit**: `429` in error_message → check OpenAI dashboard, reduce concurrency.
   - **OPENAI_API_KEY invalid / expired**: All imports fail at persona or embedding stage → rotate key in Supabase secrets.
   - **No captions available**: Many YouTube imports fail at transcripts stage → expected; not a system error.

### Quota reset not happening

1. Run **Q10** and check `monthly_quota_reset` job run history.
2. If job is not running, pg_cron extension may have been disabled. Re-enable in Dashboard → Extensions.
3. Manually trigger the reset:
   ```sql
   SELECT public.reset_monthly_quotas();
   ```

### Email notifications not sending

1. Verify `RESEND_API_KEY` is set: Dashboard → Edge Functions → notify-import-complete → Secrets.
2. Check Edge Function logs for `Resend returned` errors.
3. Verify `profiles.email_notifications_enabled = true` for the affected user.
4. Check that migration 011 has been run (adds the `email_notifications_enabled` column).

---

## Secrets reference

| Secret | Where used | How to rotate |
|--------|-----------|---------------|
| `OPENAI_API_KEY` | `process-transcripts`, `generate-speaker-persona`, `embed-speech-samples` | Dashboard → Secrets → update → redeploy functions |
| `YOUTUBE_API_KEY` | `run-import-orchestrator` | Same as above |
| `SPOTIFY_CLIENT_ID` | `run-import-orchestrator`, `process-transcripts` | Same as above |
| `SPOTIFY_CLIENT_SECRET` | `run-import-orchestrator`, `process-transcripts` | Same as above |
| `RESEND_API_KEY` | `notify-import-complete` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions (auto-injected) | Rotated via Supabase project settings; update `app.service_role_key` DB setting too |

---

## Cost estimation (monthly)

Assuming 100 imports/month, mix of YouTube channels (20 videos):

| Component | Unit cost | 100 imports |
|-----------|-----------|-------------|
| GPT-4o persona | ~$0.010/import | ~$1.00 |
| text-embedding-3-small | ~$0.001/import | ~$0.10 |
| YouTube Data API | Free (10K units/day quota) | $0 |
| Supabase Edge Functions | Free tier: 500K invocations/month | $0 |
| Supabase Database | Included in plan | $0 |
| Resend emails | Free tier: 3K emails/month | $0 |
| **Total** | | **~$1.10/month** |

Scale: at 1 000 imports/month the OpenAI cost is ~$11. At 10 000 it's ~$110.
The dominant cost driver is GPT-4o for persona generation.
