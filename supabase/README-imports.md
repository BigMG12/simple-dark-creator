# BIG SPEAKING — Speaker Import Pipeline

Turns a YouTube channel, Rumble page, Spotify podcast, or uploaded audio into a
full speaker training persona with OpenAI embeddings.

---

## Architecture

```
Frontend POST /create-speaker-import-job
        │
        ▼  (fire-and-forget)
run-import-orchestrator
  │  ├── YouTube Data API → channel info + video list
  │  ├── Spotify Web API  → show info + episode list
  │  └── Rumble scraper   → page metadata
        │
        ▼  (insert transcript_jobs, fire-and-forget)
process-transcripts  ──────────────────────────────┐
  │  ├── youtube_captions  → unofficial timedtext   │
  │  ├── spotify_transcript→ Spotify API endpoint   │ re-triggers
  │  └── whisper_api       → Supabase Storage only  │ itself if
        │                                           │ near 6-min
        ▼ (when ≥60% complete)                      │ timeout
generate-speaker-persona                           ◄┘
  │  └── GPT-4o → PersonaProfile JSON
  │     → INSERT speakers row
        │
        ▼ (fire-and-forget)
embed-speech-samples
     └── text-embedding-3-small (1536-dim)
         → INSERT speech_embeddings
         → UPDATE speakers.transcribed_minutes / video_count_analyzed
         → SET channel_imports.status = 'complete'
```

---

## Required Secrets

Auto-injected by Supabase (no manual setup needed):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Set the rest via the Supabase CLI or Dashboard (Settings → Edge Functions → Secrets):

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set YOUTUBE_API_KEY=AIza...
supabase secrets set SPOTIFY_CLIENT_ID=...
supabase secrets set SPOTIFY_CLIENT_SECRET=...
supabase secrets set RESEND_API_KEY=re_...   # optional — completion emails
```

---

## Getting API Keys

### YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Enable **YouTube Data API v3** under APIs & Services → Library
4. Create credentials → **API Key**
5. (Optional but recommended) Restrict the key to YouTube Data API v3 and
   your Supabase Edge Function IP range
6. Default quota: **10 000 units/day**
   - `playlistItems.list`: 1 unit/call (50 videos each)
   - `videos.list`: 1 unit/call (50 videos each)
   - `search.list`: 100 units/call — **avoid, use playlistItems instead**
   - Caption fetching via the unofficial timedtext endpoint: **0 quota units**
   - If you need more quota, request an increase in Cloud Console

### Spotify Web API

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an App
3. Copy **Client ID** and **Client Secret**
4. Set Redirect URI to `https://your-project.supabase.co` (required by
   Spotify even for client credentials flow)
5. The pipeline uses the **Client Credentials** flow — no user login needed
6. Episode transcript access is a beta feature; most shows don't have it yet

### OpenAI

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an API key
3. Models used:
   - **GPT-4o** — persona generation (~$0.005 per import at 80K tokens)
   - **text-embedding-3-small** — embeddings ($0.00002 per 1K tokens;
     100 chunks × 375 words ≈ 500 tokens ≈ $0.001 per import)

---

## Deploying Edge Functions

```bash
# Deploy all at once (recommended)
supabase functions deploy

# Or individually:
supabase functions deploy create-speaker-import-job
supabase functions deploy run-import-orchestrator
supabase functions deploy process-transcripts
supabase functions deploy generate-speaker-persona
supabase functions deploy embed-speech-samples
supabase functions deploy retry-import
supabase functions deploy cancel-import
supabase functions deploy retry-stuck-imports
supabase functions deploy notify-import-complete
```

**Required secrets** (Dashboard → Edge Functions → Secrets):
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set YOUTUBE_API_KEY=AIza...
supabase secrets set SPOTIFY_CLIENT_ID=...
supabase secrets set SPOTIFY_CLIENT_SECRET=...
supabase secrets set RESEND_API_KEY=re_...   # optional — for import completion emails
```

---

## Running the Database Migrations

```bash
# Apply all pending migrations
supabase db push
```

Or paste each file manually into the SQL Editor in order:

| File | What it adds |
|------|-------------|
| `001_initial_schema.sql` | Core tables, RLS, storage bucket |
| `002_rpc_functions.sql` | Helper RPCs |
| `003_storage_layer.sql` | Storage policies |
| `004_enable_realtime.sql` | Realtime publication |
| `005_speaker_imports.sql` | `channel_imports`, `transcript_jobs`, `speech_embeddings`, pgvector |
| `005_v2_features.sql` | V2 style-matching columns |
| `006_import_helpers.sql` | `increment_import_progress()`, `get_import_summary()`, `user_import_feed` view |
| `006_import_reliability.sql` | `retry_count`, `updated_at`, `user_speaker_imports_quota`, `import_events`, cancelled/skipped statuses |
| `007_pg_cron_jobs.sql` | `stuck_import_recovery`, `monthly_quota_reset`, `transcript_job_cleanup` crons |
| `008_quota_tier_helpers.sql` | `check_import_quota()`, `increment_import_quota()`, realtime on channel_imports |
| `009_import_complete_trigger.sql` | DB trigger → `notify-import-complete` via pg_net |
| `010_poll_queued_imports_cron.sql` | pg_cron → `retry-stuck-imports` edge function every 10 min |
| `011_notify_complete_extras.sql` | `profiles.email_notifications_enabled`, extend `achievements_log.event_type` |

> **pgvector is required.** Available on all Supabase projects.
> `pg_cron` and `pg_net` are required for automated recovery — enable them in
> Dashboard → Database → Extensions (Pro plan and above).

---

## Stuck Import Recovery (Automated)

Imports can get stuck if an Edge Function crashes mid-flight.
Two layers of automated recovery handle this:

1. **`stuck_import_recovery` pg_cron** (every 10 min, migration 007)  
   Resets imports that have been in any in-progress status for > 15 min back to `queued`.
   After 3 retries it marks the import as `failed` with "exceeded retry limit".

2. **`poll_queued_imports` pg_cron → `retry-stuck-imports` edge function** (every 10 min, migration 010)  
   Finds `queued` imports older than 2 min and calls `run-import-orchestrator` for each.
   This bridges the gap between DB state and Edge Function execution.

**Setup required** (one-time, in SQL Editor):
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
```

For monitoring and incident response, see `OPERATIONS-RUNBOOK.md`.

---

## Source Type Capabilities

| Source | Metadata | Transcripts | Notes |
|--------|----------|-------------|-------|
| `youtube_channel` | ✅ YouTube Data API | ✅ Unofficial timedtext | Captions must exist; Shorts & live streams excluded |
| `youtube_video` | ✅ YouTube Data API | ✅ Unofficial timedtext | Single video |
| `rumble` | ⚠️ Scraped | ❌ No caption API | Falls back to failed unless captions in page HTML |
| `spotify` | ✅ Spotify Web API | ⚠️ Beta API | Most shows don't have API transcripts yet |
| `upload` | N/A | ✅ Whisper | User must own rights; any supported audio format |

---

## Legal Notes

| Action | Status | Basis |
|--------|--------|-------|
| YouTube metadata via official API | ✅ Permitted | YouTube Data API ToS |
| YouTube captions via timedtext endpoint | ✅ Permitted | Publicly displayed content; standard practice |
| YouTube audio downloading | ❌ Prohibited | YouTube ToS Section 5.B |
| Spotify metadata via official API | ✅ Permitted | Spotify Developer ToS |
| Spotify episode transcripts via API | ✅ Permitted (where available) | Spotify Developer ToS |
| Spotify audio downloading | ❌ Prohibited | Spotify ToS |
| User-uploaded audio (Whisper) | ✅ Permitted | User attests to ownership on upload |

---

## Monthly Quota & Tiers

Quota is enforced by `create-speaker-import-job` via the `check_import_quota()`
RPC function (migration 008). Limits are tier-based:

| Tier | Imports / month | Videos per import |
|------|-----------------|-------------------|
| `free` (default) | 5 | 25 |
| `pro` | 50 | 100 |

The quota row is created automatically on first import. To upgrade a user to Pro,
run in the SQL Editor:

```sql
UPDATE public.user_speaker_imports_quota
SET tier = 'pro'
WHERE user_id = 'USER-UUID-HERE';
```

The rolling 30-day window resets automatically via the `monthly_quota_reset`
pg_cron job (daily at 00:00 UTC).

---

## Similarity Search with Embeddings

After a speaker is imported, their speech is stored as 1536-dim vectors in
`speech_embeddings`. To find which imported speaker a user's recording sounds
most like, use pgvector's cosine similarity:

```sql
SELECT
  s.id,
  s.name,
  AVG(1 - (se.embedding <=> query_embedding)) AS similarity
FROM speech_embeddings se
JOIN speakers s ON s.id = se.speaker_id
WHERE se.embedding <=> '[0.1, 0.2, ...]'::vector < 0.5  -- threshold
GROUP BY s.id, s.name
ORDER BY similarity DESC
LIMIT 5;
```

Replace `query_embedding` with the embedded text of the user's recording
(embed via `embed-speech-samples` or a one-off OpenAI Embeddings call).

---

## Environment Variables Quick Reference

| Variable | Source | Used By |
|----------|--------|---------|
| `SUPABASE_URL` | Auto-injected | All functions |
| `SUPABASE_ANON_KEY` | Auto-injected | create-speaker-import-job, retry-import, cancel-import (auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | All functions (DB writes) |
| `OPENAI_API_KEY` | Manual secret | process-transcripts, generate-speaker-persona, embed-speech-samples |
| `YOUTUBE_API_KEY` | Manual secret | run-import-orchestrator |
| `SPOTIFY_CLIENT_ID` | Manual secret | run-import-orchestrator, process-transcripts |
| `SPOTIFY_CLIENT_SECRET` | Manual secret | run-import-orchestrator, process-transcripts |
| `RESEND_API_KEY` | Manual secret (optional) | notify-import-complete |
