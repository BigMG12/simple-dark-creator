# analyze-recording — Supabase Edge Function

Runs the full BIG SPEAKING analysis pipeline for a completed recording.

---

## Environment variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your project URL — set automatically by Supabase |
| `SUPABASE_ANON_KEY` | Anon/public key — set automatically |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for privileged DB writes — set automatically |
| `OPENAI_API_KEY` | Your OpenAI API key — must be set manually |

Set the OpenAI key as a Supabase secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

> **No new env vars are required.** The embedding and category-analysis calls reuse `OPENAI_API_KEY`.

---

## Pipeline steps

| # | Step | Model / tool | Fatal? |
|---|---|---|---|
| 3 | Download audio from Storage | service_role | yes |
| 4 | Transcribe with Whisper | `whisper-1` | yes |
| 5 | Compute raw metrics | in-process | yes |
| 6 | Fetch target speaker **+ category join** | Postgres | yes |
| 7 | GPT base analysis (with category lens in prompt) | `gpt-4o` | yes |
| 8 | Insert base analysis row | Postgres | yes |
| 9a | Category-specific analysis | `gpt-4o` | **no** |
| 9b | Style match scoring (embedding + sub-scores) | `text-embedding-3-small` + `gpt-4o-mini` | **no** |
| 9c | Persist new fields to analyses row | Postgres | **no** |
| 10 | Update XP / level / streak | Postgres | no |
| 11 | Badge evaluation | Postgres | no |
| 12 | Drill completion | Postgres | no |
| 13 | Mark recording `complete` | Postgres | no |

Steps 9a and 9b are **non-fatal**: if they fail (e.g. speaker has no embeddings, no category assigned, transient OpenAI error), the base analysis is already committed and the recording is still marked `complete`. The new columns in `analyses` will be `null` for that row.

---

## New response fields

The JSON response now includes these additional fields alongside the existing ones:

```jsonc
{
  // ... existing fields ...

  // null when speaker has no category assigned
  "category_metrics": {
    "urgency_score": 72,
    "authority_score": 65
    // dimensions defined by speaker_categories.analysis_lens.dimensions
  },

  // null when speaker has no speech_embeddings rows
  "style_match_score": 68,

  // null when style_match_score is null
  "style_match_breakdown": {
    "vector_similarity": 71,   // cosine similarity vs mentor corpus, 0-100
    "vocabulary_match":  55,   // % of mentor signature_phrases found, 0-100
    "energy_match":      80,   // WPM + pause frequency vs mentor ideal, 0-100
    "structure_match":   62,   // GPT-evaluated structural similarity, 0-100
    "signature_adoption": 2    // raw count of exact signature phrases used
  },

  // null when speaker has no category
  "mentor_alternative_phrasing": "Here's the direct Jobs version: 'One more thing — and it changes everything.'",

  // always present (empty array when no matches)
  "signature_phrases_used": ["one more thing", "and it changes everything"]
}
```

### style_match_score weights

| Sub-score | Weight |
|---|---|
| `vector_similarity` | 40% |
| `vocabulary_match` | 25% |
| `energy_match` | 25% |
| `structure_match` | 10% |

---

## Database expectations

Run migration `005_style_matching.sql` before deploying this version.

The function reads/writes these tables:

| Table | Key columns used |
|---|---|
| `recordings` | `id`, `user_id`, `audio_url`, `status`, `drill_id`, `duration_seconds`, `transcript` |
| `profiles` | `user_id`, `current_xp`, `current_level`, `current_streak`, `longest_streak`, `last_session_date`, `selected_speaker_id` |
| `speakers` | `id`, `name`, `specialty`, `signature_trait`, `ideal_wpm_min`, `ideal_wpm_max`, `pause_frequency`, `energy_profile`, `sort_order`, **`category_id`**, **`signature_phrases`**, **`persuasion_techniques`**, **`style_traits`** |
| `speaker_categories` | **`id`**, **`name`**, **`analysis_lens`** |
| `speech_embeddings` | **`speaker_id`**, **`embedding`** (via RPC) |
| `analyses` | full schema — see insert payload in `index.ts`; **new nullable columns**: `category_metrics`, `style_match_score`, `style_match_breakdown`, `mentor_alternative_phrasing`, `signature_phrases_used` |
| `badges` | `id`, `name`, `condition_type`, `condition_value` |
| `user_badges` | `user_id`, `badge_id`, `analysis_id` |
| `achievements_log` | `user_id`, `event_type`, `metadata` |
| `drills` | `id`, `xp` |
| `user_drill_completions` | `user_id`, `drill_id`, `score`, `completed_at` |

Storage bucket: `recordings` (private; service role key handles downloads).

### speaker_categories.analysis_lens schema

```jsonc
{
  "ai_focus_prompt": "You are analysing a motivational speech. Focus on...",
  "dimensions": [
    {
      "key": "urgency_score",
      "label": "Urgency",
      "description": "How urgently the speaker conveys their message",
      "scale": [0, 100]
    }
  ]
}
```

### match_speech_embeddings RPC

```sql
SELECT * FROM match_speech_embeddings(
  p_speaker_id  := '<uuid>',
  p_embedding   := '<vector>',
  p_match_count := 20          -- optional, default 20
);
-- Returns: id UUID, chunk_text TEXT, similarity FLOAT
```

The RPC draws a **random sample** of `p_match_count` chunks from the speaker's corpus and returns each with its cosine similarity to the query vector. The Edge Function sorts by similarity and averages the top 10 to produce the `vector_similarity` sub-score.

### Populating speech_embeddings

The `speech_embeddings` table is populated by a separate offline ingestion job (not this function). Speakers without rows in `speech_embeddings` get `style_match_score = null` — the base analysis still runs normally.

---

## Backwards compatibility

- All new `analyses` columns are **nullable** — existing rows are unaffected.
- The response always includes the new keys; they are `null` when the data is unavailable (no category, no embeddings).
- No changes to existing response fields.

---

## Deploy

```bash
supabase db push          # applies 005_style_matching.sql
supabase functions deploy analyze-recording
```

---

## Test locally

```bash
supabase start

supabase functions serve analyze-recording \
  --env-file .env.local

# .env.local must contain:
# OPENAI_API_KEY=sk-...

curl -i -X POST http://localhost:54321/functions/v1/analyze-recording \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"recording_id": "<uuid>"}'
```

The recording row must exist in `recordings`, the audio file must be in the `recordings` storage bucket at the path stored in `audio_url`, and `status` must not be `'analyzing'` (to avoid double-processing).

---

## Error handling

On any **fatal** error the function sets `recordings.status = 'failed'`, logs the error to stdout (visible in `supabase functions logs analyze-recording`), and returns HTTP 500 with `{ "error": "<message>" }`.

**Non-fatal** steps (9a, 9b, 9c) catch their own exceptions, log a warning, and allow the pipeline to continue. The base analysis is committed before any non-fatal step runs.

### Supported badge `condition_type` values

| condition_type | Meaning |
|---|---|
| `first_recording` | At least 1 session completed |
| `score_gte` | `overall_score >= condition_value` |
| `sessions_gte` | Total sessions >= condition_value |
| `streak_gte` | Current streak >= condition_value |
| `no_fillers` | Zero filler words detected |
| `filler_density_lte` | Fillers/min <= condition_value |
| `pause_mastery_gte` | Pause mastery score >= condition_value |
| `vocab_depth_gte` | Vocabulary depth score >= condition_value |
