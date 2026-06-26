# Conversation analysis pipeline

Three edge functions that turn an uploaded call/meeting recording into a typed,
scored coaching report.

```
upload (client)
   │
   ▼
process-conversation        ── Deepgram nova-2 (transcribe + diarize)
   │                           status: diarizing → awaiting_speaker_selection
   │                                            ↘ analyzing (1 speaker shortcut)
   ▼
select-user-speaker         ── user picks "this is me"
   │                           status: → analyzing
   ▼
analyze-conversation        ── GPT-4o with type-specific prompt
                               status: → complete
                               side effects: XP, personal_records, goals
```

## Function endpoints

| Function                | Auth                         | Body                                              |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| `process-conversation`  | User JWT (Authorization)     | `{ conversation_id }`                             |
| `select-user-speaker`   | User JWT (Authorization)     | `{ conversation_id, speaker_label }`              |
| `analyze-conversation`  | service_role only (internal) | `{ conversation_id }`                             |

`analyze-conversation` is fire-and-forget — invoked from the other two
functions with `EdgeRuntime.waitUntil`. Direct client calls are rejected.

## Status machine

```
pending
  └─→ diarizing
        ├─→ awaiting_speaker_selection ─→ analyzing ─→ complete
        ├─→ analyzing (single-speaker shortcut)    ─→ complete
        └─→ failed (error_message populated)
```

## Required tables

The functions assume these tables exist in `public`:

- `conversations` — `id, user_id, audio_url, audio_mime_type,
  conversation_type, status, duration_seconds, context_stakes, context_goal,
  context_other_party, diarization_data jsonb, transcript_full text,
  transcript_user_only text, user_speaker_label text, error_message text`
- `conversation_analyses` — `conversation_id, user_id, conversation_type,
  overall_score, talk_time_ratio, type_specific_metrics jsonb,
  timeline_events jsonb, moments_of_truth jsonb, improvement_tips jsonb,
  feedback_summary text, scorecard jsonb, xp_awarded int`
- `profiles` (`id, xp`), `personal_records`, `goals` for gamification

## Required storage bucket

`conversations` (private). RLS should allow the owning user to upload and
the service_role to read.

## Required secrets

| Secret             | Where                                             |
| ------------------ | ------------------------------------------------- |
| `DEEPGRAM_API_KEY` | https://console.deepgram.com → API Keys           |
| `OPENAI_API_KEY`   | https://platform.openai.com/api-keys (model gpt-4o) |

## Deepgram setup

1. Sign up at https://deepgram.com — new accounts get **$200 in free credit**.
2. Console → **API Keys** → **Create Key** with the `member` role (read+write).
3. Copy the key and add it as a Lovable Cloud secret named `DEEPGRAM_API_KEY`.

### Pricing (nova-2 with diarization)

| Audio length | Approx cost |
| ------------ | ----------- |
| 5 min        | $0.02       |
| 30 min       | $0.13       |
| 60 min       | $0.26       |

Source: https://deepgram.com/pricing — ~**$0.0043/min**.

## Conversation types and metric keys

The `conversation_type` column drives which metrics GPT returns:

- `sales_call` — urgency_triggers, value_frames, objections_faced,
  objection_recovery_score, close_attempts, value_anchors, questions_asked,
  discovery_depth_score
- `meeting` — contribution_clarity_score, interruption_count,
  interrupted_by_others, action_items_proposed, listening_signals_score,
  contribution_count
- `interviewee` — answer_length_avg_seconds, filler_density_per_minute,
  star_method_score, confidence_markers, dodge_count, specific_examples_given
- `interviewer` — question_quality_score, follow_up_depth,
  listening_signals_score, silence_tolerance_score, open_ended_ratio
- `negotiation` — anchoring_strength, framing_score, concession_ratio,
  patience_markers, tactical_empathy_score, mirroring_count
- `coaching` — question_to_statement_ratio, guidance_clarity_score,
  socratic_depth_score, affirmation_count

## Error handling

- **< 30s upload** → rejected with friendly message; status = `failed`.
- **Deepgram detects only one speaker** → skips selection, runs the analysis
  on that speaker directly (status: `diarizing → analyzing`).
- **Deepgram timeout / 5xx** → falls back to invoking `analyze-recording`
  (the existing solo pipeline) and notes "single-speaker fallback" on the
  conversation row.
- **OpenAI error** → status = `failed`, `error_message` is populated.

## XP formula

```
xp_awarded = 20 + floor(overall_score / 2)
```

Conversations are rarer than practice sessions, so they're worth ~2× a
solo recording at the same score.
