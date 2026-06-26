-- ============================================================
-- BIG SPEAKING — v2 Features Migration
-- Run AFTER migrations 001–004.
-- Adds: speaker categories, import pipeline, AI personas,
--       vector embeddings, extended analysis metrics.
-- BACKWARDS COMPATIBLE — no existing tables or data removed.
-- ============================================================


-- ============================================================
-- SECTION 1: EXTENSIONS
-- NOTE: Enable "vector" in Supabase Dashboard →
--       Database → Extensions before running this file.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================
-- SECTION 2: NEW TABLE — speaker_categories
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speaker_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  display_name  TEXT        NOT NULL,
  icon_name     TEXT        NOT NULL,
  color_hsl     TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  analysis_lens JSONB       NOT NULL DEFAULT '{}',
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- SECTION 3: NEW TABLE — channel_imports
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channel_imports (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type             TEXT        NOT NULL
                          CHECK (source_type IN (
                            'youtube_channel','youtube_video','rumble','spotify','upload'
                          )),
  source_url              TEXT,
  source_metadata         JSONB       NOT NULL DEFAULT '{}',
  target_category_id      UUID        REFERENCES public.speaker_categories(id) ON DELETE SET NULL,
  custom_name_override    TEXT,
  custom_trait_override   TEXT,
  status                  TEXT        NOT NULL DEFAULT 'queued'
                          CHECK (status IN (
                            'queued','fetching_metadata','fetching_transcripts',
                            'transcribing_audio','analyzing_style','generating_persona',
                            'embedding','complete','failed'
                          )),
  progress_current        INT         NOT NULL DEFAULT 0,
  progress_total          INT         NOT NULL DEFAULT 0,
  error_message           TEXT,
  resulting_speaker_id    UUID        REFERENCES public.speakers(id) ON DELETE SET NULL,
  estimated_completion_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ
);


-- ============================================================
-- SECTION 4: NEW TABLE — transcript_jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transcript_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id         UUID        NOT NULL REFERENCES public.channel_imports(id) ON DELETE CASCADE,
  source_url        TEXT        NOT NULL,
  source_title      TEXT        NOT NULL,
  duration_seconds  INT,
  transcript_method TEXT        NOT NULL
                    CHECK (transcript_method IN (
                      'youtube_captions','whisper_api','spotify_transcript'
                    )),
  transcript_text   TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','complete','failed','skipped')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);


-- ============================================================
-- SECTION 5: NEW TABLE — speech_embeddings
-- Requires pgvector. embedding = OpenAI text-embedding-3-small.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speech_embeddings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id     UUID        NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  chunk_text     TEXT        NOT NULL,
  chunk_metadata JSONB       NOT NULL DEFAULT '{}',
  embedding      vector(1536),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- SECTION 6: NEW TABLE — user_speaker_imports_quota
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_speaker_imports_quota (
  user_id            UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  imports_this_month INT         NOT NULL DEFAULT 0,
  quota_limit        INT         NOT NULL DEFAULT 5,
  reset_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);


-- ============================================================
-- SECTION 7: ALTER TABLE speakers — add v2 columns
-- ============================================================

ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS category_id           UUID    REFERENCES public.speaker_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type           TEXT    NOT NULL DEFAULT 'curated',
  ADD COLUMN IF NOT EXISTS source_url            TEXT,
  ADD COLUMN IF NOT EXISTS source_user_id        UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transcribed_minutes   INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_count_analyzed  INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_phrases     JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS common_themes         JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS persuasion_techniques JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS style_traits          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS perfect_for           TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url            TEXT,
  ADD COLUMN IF NOT EXISTS is_public             BOOLEAN NOT NULL DEFAULT true;

-- Add check constraint separately for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'speakers_source_type_check' AND conrelid = 'public.speakers'::regclass
  ) THEN
    ALTER TABLE public.speakers
      ADD CONSTRAINT speakers_source_type_check
      CHECK (source_type IN ('curated','imported','community'));
  END IF;
END;
$$;


-- ============================================================
-- SECTION 8: ALTER TABLE analyses — add v2 columns
-- ============================================================

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS category_metrics            JSONB,
  ADD COLUMN IF NOT EXISTS style_match_score           NUMERIC,
  ADD COLUMN IF NOT EXISTS style_match_breakdown       JSONB,
  ADD COLUMN IF NOT EXISTS mentor_alternative_phrasing TEXT,
  ADD COLUMN IF NOT EXISTS signature_phrases_used      JSONB NOT NULL DEFAULT '[]';


-- ============================================================
-- SECTION 9: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_channel_imports_user_status
  ON public.channel_imports (user_id, status);

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_import_status
  ON public.transcript_jobs (import_id, status);

CREATE INDEX IF NOT EXISTS idx_speakers_category_source
  ON public.speakers (category_id, source_type);

CREATE INDEX IF NOT EXISTS idx_speech_embeddings_speaker
  ON public.speech_embeddings (speaker_id);

-- Approximate nearest-neighbour cosine search.
-- lists=100 is suitable for up to ~1M vectors.
CREATE INDEX IF NOT EXISTS idx_speech_embeddings_ivfflat
  ON public.speech_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- ============================================================
-- SECTION 10: ROW LEVEL SECURITY — new tables
-- ============================================================

ALTER TABLE public.speaker_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_imports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_embeddings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_speaker_imports_quota ENABLE ROW LEVEL SECURITY;

-- speaker_categories: read-only for all authenticated
CREATE POLICY "speaker_categories: select authenticated"
  ON public.speaker_categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- channel_imports: full CRUD on own rows
CREATE POLICY "channel_imports: select own"
  ON public.channel_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "channel_imports: insert own"
  ON public.channel_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "channel_imports: update own"
  ON public.channel_imports FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "channel_imports: delete own"
  ON public.channel_imports FOR DELETE
  USING (auth.uid() = user_id);

-- transcript_jobs: read via import ownership
CREATE POLICY "transcript_jobs: select own"
  ON public.transcript_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_imports ci
      WHERE ci.id = import_id AND ci.user_id = auth.uid()
    )
  );

-- speech_embeddings: read curated speakers + own imported speakers
CREATE POLICY "speech_embeddings: select accessible"
  ON public.speech_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.speakers s
      WHERE s.id = speaker_id
        AND (s.source_type = 'curated' OR s.source_user_id = auth.uid())
    )
  );

-- user_speaker_imports_quota: own row only
CREATE POLICY "imports_quota: select own"
  ON public.user_speaker_imports_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "imports_quota: insert own"
  ON public.user_speaker_imports_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "imports_quota: update own"
  ON public.user_speaker_imports_quota FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- speakers: replace original catch-all policy with v2 scoped policy
DROP POLICY IF EXISTS "speakers: select authenticated" ON public.speakers;

CREATE POLICY "speakers: select curated or own imported"
  ON public.speakers FOR SELECT
  USING (
    source_type = 'curated'
    OR source_user_id = auth.uid()
  );


-- ============================================================
-- SECTION 11: SEED — speaker_categories
-- Using deterministic UUIDs so speaker rows can reference them.
-- ============================================================

INSERT INTO public.speaker_categories
  (id, name, display_name, icon_name, color_hsl, description, analysis_lens, sort_order)
VALUES

-- 1 · MOTIVATION ─────────────────────────────────────────────
(
  '11111111-1111-1111-1111-111111111101',
  'motivation',
  'Motivation',
  'Flame',
  '22 95% 57%',
  'Masters of igniting internal drive, transforming mindset, and compelling audiences to take immediate action through emotional intensity and personal testimony.',
  '{
    "title": "Motivation & Energy Analysis",
    "dimensions": [
      {
        "key": "energy_arc",
        "label": "Energy Arc",
        "type": "score_0_100",
        "description": "How effectively the speaker builds emotional energy from opening to peak — does intensity rise strategically, or stay flat throughout?"
      },
      {
        "key": "call_to_action_strength",
        "label": "Call-to-Action Strength",
        "type": "score_0_100",
        "description": "How clear, specific, and urgent are the actions the speaker demands of the audience? Vague inspiration scores low; specific behavioral commands score high."
      },
      {
        "key": "personal_testimony_usage",
        "label": "Personal Testimony Usage",
        "type": "count",
        "description": "Number of times the speaker uses their own story as evidence for a claim. Earned testimony is the primary credibility mechanism in motivational speaking."
      },
      {
        "key": "permission_statements",
        "label": "Permission Statements",
        "type": "count",
        "description": "Count of explicit statements that give the audience permission to want more, try again, or believe they are capable. These are the core delivery unit of motivational speaking."
      }
    ],
    "ai_focus_prompt": "Analyze this speech as a motivational performance. Evaluate how effectively the speaker builds emotional energy from the opening through to the peak moment — does the arc rise deliberately or stay flat? Count and assess the quality of permission statements (moments where the speaker explicitly grants the listener permission to want more, believe in themselves, or try again). Identify how personal testimony is used as evidence rather than biography, and score how effectively vulnerability is converted into audience empowerment. Assess the specificity and urgency of any calls to action — a great motivational speaker does not leave the audience inspired but directionless. Note any rhetorical devices (anaphora, tricolon, direct address) that amplify emotional impact."
  }'::jsonb,
  1
),

-- 2 · SALES ──────────────────────────────────────────────────
(
  '11111111-1111-1111-1111-111111111102',
  'sales',
  'Sales & Closing',
  'TrendingUp',
  '142 65% 42%',
  'Elite closers and persuasion architects who master tonality, objection handling, and the psychological triggers that move prospects from resistance to commitment.',
  '{
    "title": "Sales Performance Breakdown",
    "dimensions": [
      {
        "key": "urgency_triggers",
        "label": "Urgency Triggers",
        "type": "count",
        "description": "Count of linguistic devices that create time pressure or scarcity — deadline framing, opportunity cost language, loss aversion appeals, and FOMO construction."
      },
      {
        "key": "value_frames",
        "label": "Value Frames",
        "type": "count",
        "description": "Number of times the speaker reframes price, effort, or risk against a larger value proposition — making the cost feel small relative to the benefit delivered."
      },
      {
        "key": "objection_preemption",
        "label": "Objection Pre-emption",
        "type": "score_0_100",
        "description": "How proactively does the speaker name and neutralise likely objections before the prospect raises them? Reactive objection handling scores lower than proactive inoculation."
      },
      {
        "key": "close_strength",
        "label": "Close Strength",
        "type": "score_0_100",
        "description": "Evaluates the directness, confidence, and specificity of the speaker''s closing language. Does the speech build to a clear, decisive ask with a specific next step?"
      }
    ],
    "ai_focus_prompt": "Analyze this speech as a sales performance. Count and categorize urgency triggers — any language that creates time pressure, scarcity, loss aversion, or opportunity cost framing. Identify value frames where the speaker makes cost feel irrelevant by anchoring it against a larger benefit. Score objection pre-emption: does the speaker proactively name likely resistance points and neutralize them before they arise? Assess the close — is there a clear, confident, specific ask with a defined next step, or does the speech end in inspiration without a decision mechanism? Note tonality patterns: does the speaker''s delivery signal certainty throughout, and where does hesitation, hedging, or qualifying language appear? These undermine close strength more than any content weakness."
  }'::jsonb,
  2
),

-- 3 · INFLUENCE ──────────────────────────────────────────────
(
  '11111111-1111-1111-1111-111111111103',
  'influence',
  'Influence',
  'Zap',
  '271 75% 60%',
  'Psychological architects of belief and behaviour change — deploying Cialdini''s principles, strategic framing, and deep human psychology to shift how audiences think and act.',
  '{
    "title": "Influence & Persuasion Analysis",
    "dimensions": [
      {
        "key": "authority_signals",
        "label": "Authority Signals",
        "type": "count",
        "description": "Count of credibility-establishing moves: credentials cited, results referenced, expert sources invoked, or documented personal achievements used as evidence."
      },
      {
        "key": "social_proof_usage",
        "label": "Social Proof Usage",
        "type": "count",
        "description": "Number of times the speaker invokes others'' behaviour, agreement, or results to validate the position being argued — testimonials, statistics, consensus framing."
      },
      {
        "key": "reciprocity_framing",
        "label": "Reciprocity Framing",
        "type": "score_0_100",
        "description": "How effectively does the speaker give value before asking? Scores the degree to which the speech creates a psychological debt in the audience through insight, generosity, or service."
      },
      {
        "key": "commitment_consistency",
        "label": "Commitment & Consistency",
        "type": "score_0_100",
        "description": "Does the speaker secure small agreements early that make the final position difficult to reject? Scores the sophistication of the commitment ladder constructed through the speech."
      }
    ],
    "ai_focus_prompt": "Analyze this speech through the lens of influence psychology. Count authority signals — every moment the speaker establishes credibility through credentials, documented results, or expert affiliation. Count social proof deployments — statistics, testimonials, and consensus framing. Score reciprocity framing: does the speaker deliver genuine value (insight, frameworks, specific advice) before making any ask, creating a psychological debt? Evaluate the commitment ladder: are small agreements sought early in the speech that make resistance to the final position psychologically inconsistent? Identify any use of scarcity, liking, or unity principles. Flag any manipulation tactics that cross from ethical influence to deceptive persuasion — this distinction matters for the student''s own ethical development."
  }'::jsonb,
  3
),

-- 4 · LEADERSHIP ─────────────────────────────────────────────
(
  '11111111-1111-1111-1111-111111111104',
  'leadership',
  'Leadership',
  'Shield',
  '210 85% 48%',
  'Visionary communicators who move people through shared purpose, moral authority, and the rare ability to articulate a future that others will sacrifice to reach.',
  '{
    "title": "Leadership Communication Analysis",
    "dimensions": [
      {
        "key": "vision_clarity",
        "label": "Vision Clarity",
        "type": "score_0_100",
        "description": "How vividly and specifically does the speaker paint the future state they are asking the audience to build? Vague aspiration scores low; specific, sensory-rich destination scores high."
      },
      {
        "key": "accountability_language",
        "label": "Accountability Language",
        "type": "count",
        "description": "Count of statements where the speaker takes personal ownership rather than deflecting blame — first-person accountability signals that distinguish leaders from managers."
      },
      {
        "key": "empowerment_signals",
        "label": "Empowerment Signals",
        "type": "count",
        "description": "Number of moments where the speaker actively elevates the audience''s sense of capacity, importance, or agency — the opposite of creating dependence on the speaker."
      },
      {
        "key": "decisiveness_score",
        "label": "Decisiveness",
        "type": "score_0_100",
        "description": "Does the speaker communicate decisions and positions with clarity and conviction, or does hedging language undermine authority? Leaders who over-qualify lose rooms."
      }
    ],
    "ai_focus_prompt": "Analyze this speech as a leadership communication. Score vision clarity: how specifically and sensorially does the speaker describe the destination — can the audience see, feel, and want it? Count accountability statements where the speaker owns outcomes rather than attributing them to external forces. Count empowerment signals: moments where the audience is elevated, given agency, or told they are the mechanism of the vision''s achievement. Assess decisiveness: does the speaker communicate positions with conviction, or does qualifying language undermine authority? Identify inclusive language patterns — use of ''we,'' ''our,'' ''together'' — that create shared identity around the mission. Note whether the speaker''s moral authority comes from credentials, lived experience, or demonstrated sacrifice, since these carry different audience weights."
  }'::jsonb,
  4
),

-- 5 · STORYTELLING ───────────────────────────────────────────
(
  '11111111-1111-1111-1111-111111111105',
  'storytelling',
  'Storytelling',
  'BookOpen',
  '338 85% 58%',
  'Narrative architects who use story structure, scene specificity, and emotional truth to make ideas unforgettable and audiences feel, not just understand.',
  '{
    "title": "Storytelling Structure Analysis",
    "dimensions": [
      {
        "key": "narrative_arc_score",
        "label": "Narrative Arc",
        "type": "score_0_100",
        "description": "Does the speech contain a complete story arc — inciting incident, rising tension, dark moment, and resolution — or is it a sequence of anecdotes without structural payoff?"
      },
      {
        "key": "sensory_detail_density",
        "label": "Sensory Detail Density",
        "type": "count",
        "description": "Count of specific sensory details — named places, physical sensations, colours, sounds, smells — that ground the story in a felt reality rather than abstracted summary."
      },
      {
        "key": "emotional_beats",
        "label": "Emotional Beats",
        "type": "count",
        "description": "Number of distinct emotional transitions in the speech — moments where the audience''s feeling state is intentionally shifted. Great storytellers move audiences through multiple registers."
      },
      {
        "key": "tension_resolution_ratio",
        "label": "Tension/Resolution Ratio",
        "type": "score_0_100",
        "description": "Does the speaker spend adequate time in tension before resolving it? Speakers who rush to the lesson before the audience has felt the problem score low. Earned resolution scores high."
      }
    ],
    "ai_focus_prompt": "Analyze this speech as a storytelling performance. Score the narrative arc: is there a complete story structure with an inciting incident, escalating stakes, a genuine dark or uncertain moment, and a resolution that earns its emotional payoff? Count sensory details — specific named places, physical sensations, dialogue in the character''s actual voice, colours and sounds — that make the story inhabitable rather than merely described. Count emotional beats: how many times does the speaker intentionally shift the audience''s emotional state? Map the tension/resolution ratio: how much time is spent in the problem before the insight arrives? Premature resolution is the most common storytelling failure — the speaker reaches for the lesson before the audience has lived in the difficulty long enough to need it. Identify any story-within-a-story structures and assess how effectively the outer narrative contextualises the inner one."
  }'::jsonb,
  5
),

-- 6 · AUTHORITY ──────────────────────────────────────────────
(
  '11111111-1111-1111-1111-111111111106',
  'authority',
  'Authority',
  'Award',
  '45 90% 48%',
  'Intellectual heavyweights who build credibility through depth of knowledge, contrarian courage, and the rare ability to make complex ideas both accessible and compelling.',
  '{
    "title": "Authority & Credibility Analysis",
    "dimensions": [
      {
        "key": "credential_signals",
        "label": "Credential Signals",
        "type": "count",
        "description": "Count of authority-establishing references: academic citations, documented expertise, first-hand research, institutional affiliations, or experiential evidence that validates the speaker''s right to hold the position."
      },
      {
        "key": "contrarian_claims",
        "label": "Contrarian Claims",
        "type": "count",
        "description": "Number of positions the speaker takes that directly contradict mainstream consensus. Intellectual authority requires courage to be specifically right when most people are vaguely wrong."
      },
      {
        "key": "intellectual_depth_score",
        "label": "Intellectual Depth",
        "type": "score_0_100",
        "description": "Does the speech demonstrate genuine engagement with complexity, or does it present oversimplified takes as insight? Scored on the density of non-obvious connections, multi-disciplinary synthesis, and nuanced qualification."
      },
      {
        "key": "conviction_strength",
        "label": "Conviction Strength",
        "type": "score_0_100",
        "description": "Does the speaker hold their positions under implied challenge, or do they hedge into uselessness? Intellectual authority requires the willingness to be specifically, defensibly wrong — not vaguely safe."
      }
    ],
    "ai_focus_prompt": "Analyze this speech as an authority communication. Count credential signals — every time the speaker establishes their right to hold a position through documented expertise, research, lived experience, or institutional affiliation. Count contrarian claims: positions that directly challenge mainstream consensus rather than restating accepted wisdom. This is the primary differentiator between genuine intellectual authority and confident-sounding generalism. Score intellectual depth: does the speech synthesise across disciplines, make non-obvious connections, and engage with genuine complexity — or does it package familiar ideas in confident packaging? Score conviction strength: does the speaker hold specific, defensible positions throughout, or does hedging language undermine the authority the content establishes? Note how the speaker handles uncertainty — acknowledging it honestly scores higher than papering over it with confidence."
  }'::jsonb,
  6
);


-- ============================================================
-- SECTION 12: UPDATE existing 10 speakers with category + v2 fields
-- ============================================================

-- Steve Jobs → Leadership
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111104',
  source_type = 'curated',
  signature_phrases = '["One more thing", "Insanely great", "Here''s to the crazy ones", "The most important thing is to stay hungry", "Stay foolish"]'::jsonb,
  common_themes = '["simplicity as design philosophy", "the intersection of technology and liberal arts", "vision over market research", "product as art", "legacy over profit"]'::jsonb,
  persuasion_techniques = '["the rule of three for product reveals", "villain-hero-revelation story arc", "demo as emotional climax", "strategic pause before the key word", "simple declarative sentences as doctrine"]'::jsonb,
  style_traits = '["four-second pauses before reveals", "short sentences averaging under 10 words", "zero jargon in technical presentations", "present-tense narrative immediacy", "direct eye contact with the idea not the audience"]'::jsonb,
  perfect_for = 'Ideal for product presentations, big-idea reveals, and learning the architectural simplicity that makes complex ideas feel inevitable.'
WHERE name = 'Steve Jobs';

-- Barack Obama → Leadership
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111104',
  source_type = 'curated',
  signature_phrases = '["Yes we can", "Change has come", "We are the ones we''ve been waiting for", "The audacity of hope", "That''s not who we are"]'::jsonb,
  common_themes = '["shared national identity", "inclusive collective aspiration", "moral arc of history", "the tension between ideal and reality", "community as the mechanism of change"]'::jsonb,
  persuasion_techniques = '["tricolon rising in intensity to applause trigger", "inclusive language creating shared identity", "historical parallel for present decision", "professorial setup then personal confession", "strategic silence as gravity signal"]'::jsonb,
  style_traits = '["Baptist preacher cadence with academic vocabulary", "two-to-three second pauses signalling weight", "deliberate temperature shifts from cool to warm", "anaphora for emotional climax", "specific personal anecdote before universal principle"]'::jsonb,
  perfect_for = 'Ideal for large-audience persuasion, political and civic communication, and mastering the tricolon rhythm that produces standing ovations.'
WHERE name = 'Barack Obama';

-- Martin Luther King Jr. → Leadership
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111104',
  source_type = 'curated',
  signature_phrases = '["I have a dream", "Free at last", "The arc of the moral universe is long, but it bends toward justice", "We shall overcome", "Injustice anywhere is a threat to justice everywhere"]'::jsonb,
  common_themes = '["moral justice as non-negotiable", "the redemptive power of suffering", "collective liberation over individual gain", "nonviolent resistance as strength not weakness", "the urgency of now"]'::jsonb,
  persuasion_techniques = '["anaphora creating cumulative emotional wave", "biblical and constitutional source mixing for cross-audience authority", "prophetic crescendo from argument to declaration", "naming the oppressor without dehumanizing", "moral logic before emotional appeal"]'::jsonb,
  style_traits = '["musical rise in pitch toward climax", "call and response with live audience", "sermon structure: thesis, evidence, prophetic vision", "measured opening accelerating to peak", "silence used as reverence not pause"]'::jsonb,
  perfect_for = 'Ideal for movements requiring moral authority, learning anaphora-driven crescendo, and developing the prophetic delivery that turns arguments into convictions.'
WHERE name = 'Martin Luther King Jr.';

-- Tony Robbins → Motivation
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111101',
  source_type = 'curated',
  signature_phrases = '["The only impossible journey is the one you never begin", "Change your story, change your life", "Where focus goes, energy flows", "Life happens for you, not to you", "Proximity is power"]'::jsonb,
  common_themes = '["state management and peak performance", "the six human needs", "the power of decision", "identity as the lever of lasting change", "massive action over perfect planning"]'::jsonb,
  persuasion_techniques = '["rhetorical questions forcing active participation", "physical movement and audience engagement", "rapid-fire compressed insight delivery", "state interruption through unexpected volume shifts", "future pacing into the desired identity"]'::jsonb,
  style_traits = '["relentless pace with no natural exit for the mind", "dramatic vocal range from whisper to shout in one sentence", "full-body physical commitment to the message", "direct audience callouts creating personal accountability", "energy that treats restraint as failure"]'::jsonb,
  perfect_for = 'Ideal for sustained high-energy delivery, audience state management, and developing the physical-vocal commitment that keeps rooms electrified for hours.'
WHERE name = 'Tony Robbins';

-- Simon Sinek → Leadership
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111104',
  source_type = 'curated',
  signature_phrases = '["Start with why", "People don''t buy what you do — they buy why you do it", "Leadership is not about being in charge", "Circle of Safety", "The infinite game"]'::jsonb,
  common_themes = '["purpose as the primary differentiator", "trust as the foundation of leadership", "long-term thinking over short-term results", "the biology of belonging and safety", "why before how before what"]'::jsonb,
  persuasion_techniques = '["single elegant framework applied consistently", "familiar company examples made unfamiliar", "pause of comprehension after key insight", "biological evidence for behavioural claims", "warm inclusive tone creating assumed agreement"]'::jsonb,
  style_traits = '["unhurried confidence signalling total certainty", "visible waiting while idea settles in audience", "precise term definition before application", "warmth framing every idea as for the audience''s benefit", "circular speech structure returning to opening frame"]'::jsonb,
  perfect_for = 'Ideal for framework-based communication, purpose-driven leadership messaging, and developing the patient confident delivery that makes complex ideas feel obvious.'
WHERE name = 'Simon Sinek';

-- Les Brown → Motivation
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111101',
  source_type = 'curated',
  signature_phrases = '["It''s possible", "You gotta be hungry", "Live your dreams", "Don''t let someone else''s opinion of you become your reality", "Shoot for the moon — even if you miss, you''ll land among stars"]'::jsonb,
  common_themes = '["permission to want more", "overcoming disadvantaged origins", "the power of refusing to accept limits", "hunger as the differentiating variable", "the responsibility to use your gift"]'::jsonb,
  persuasion_techniques = '["personal testimony as universal permission", "vocal contrast between intimate confession and explosive declaration", "emotional resurrection arc from failure to possibility", "direct address creating individual accountability", "repetition of the permission statement at emotional peak"]'::jsonb,
  style_traits = '["Black church oscillation between slowness and explosion", "whisper-to-shout in single emotional unit", "gradual story pressure building toward catharsis", "self-deprecating humour disarming before insight", "audience called by name or role creating personal connection"]'::jsonb,
  perfect_for = 'Ideal for learning the emotional resurrection arc, permission-based motivation, and the church-rhythm delivery that moves audiences from doubt to declaration.'
WHERE name = 'Les Brown';

-- David Goggins → Motivation
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111101',
  source_type = 'curated',
  signature_phrases = '["Stay hard", "The 40% rule", "Callus your mind", "Who''s going to carry the boats?", "You are stopping you"]'::jsonb,
  common_themes = '["the 40% rule — most people quit at 40% of capacity", "suffering as the only reliable teacher", "radical self-accountability over victimhood", "the accountability mirror", "discomfort as the only growth environment"]'::jsonb,
  persuasion_techniques = '["documented extreme personal evidence removing all excuses", "direct confrontation of audience avoidance behaviour", "specific numerical data from extreme feats", "profanity as signal of operating outside convention", "challenge issued directly with no softening"]'::jsonb,
  style_traits = '["barely-controlled urgency treating material as warning not inspiration", "zero audience management or comfort provision", "confrontation-evidence-challenge structure", "no rhetorical flourish — blunt declarative delivery", "emotional investment that reads as anger but is love"]'::jsonb,
  perfect_for = 'Ideal for developing confrontational honesty, building authority through documented evidence, and learning the zero-softening delivery that creates radical behavioural change.'
WHERE name = 'David Goggins';

-- Jordan Peterson → Authority
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111106',
  source_type = 'curated',
  signature_phrases = '["Clean your room", "Stand up straight with your shoulders back", "Compare yourself to who you were yesterday", "The antidote to chaos is meaning", "You cannot be protected from the things that frighten and hurt you"]'::jsonb,
  common_themes = '["order and chaos as the fundamental human polarity", "responsibility as the precondition of meaning", "Jungian archetypes in modern psychology", "the danger of ideological possession", "suffering as inseparable from meaningful existence"]'::jsonb,
  persuasion_techniques = '["productive pause modelling real-time rigorous thinking", "layered qualification preventing oversimplification", "cross-disciplinary synthesis creating non-obvious connections", "visible emotional authenticity including tears", "precise word selection treated as moral responsibility"]'::jsonb,
  style_traits = '["complex sentences that build through qualifications to precise conclusion", "visible word-searching pauses treated as intellectual content", "emotional register breaking unpredictably into profound feeling", "academic vocabulary made accessible through concrete analogy", "speaking as if precision is a duty not a preference"]'::jsonb,
  perfect_for = 'Ideal for intellectual authority through precision, multi-disciplinary synthesis, and developing the productive-pause delivery that signals genuine real-time thinking.'
WHERE name = 'Jordan Peterson';

-- Mel Robbins → Motivation
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111101',
  source_type = 'curated',
  signature_phrases = '["5-4-3-2-1, go", "You are never going to feel like it", "Your feelings are not facts", "The high five habit", "You are one decision away from a completely different life"]'::jsonb,
  common_themes = '["the activation gap between knowing and doing", "behavioural science applied to daily habits", "self-compassion as performance tool", "the neuroscience of hesitation", "specific micro-actions over motivational feeling"]'::jsonb,
  persuasion_techniques = '["radical personal vulnerability as trust mechanism", "scientific evidence for behavioural claims", "direct instruction over inspiration", "countdown mechanism creating urgency", "audience mirroring creating recognition and safety"]'::jsonb,
  style_traits = '["confessional openings that lower audience defences immediately", "fluent switching between vulnerable, scientific, and urgent registers", "behavioural specificity — never advice at principle level when action level is possible", "infectious enthusiasm reading as joy not performance", "direct address treating audience as capable adults not patients"]'::jsonb,
  perfect_for = 'Ideal for actionable habit communication, vulnerability-based trust building, and developing the fluid register-switching that keeps audiences both feeling and learning.'
WHERE name = 'Mel Robbins';

-- Gary Vaynerchuk → Authority
UPDATE public.speakers SET
  category_id = '11111111-1111-1111-1111-111111111106',
  source_type = 'curated',
  signature_phrases = '["Self-awareness is the game", "Macro patience, micro speed", "Legacy is greater than currency", "Skills are cheap, passion is priceless", "Stop doing shit you hate"]'::jsonb,
  common_themes = '["self-awareness as the primary competitive advantage", "attention as the real currency of business", "long-term thinking in a short-term world", "building personal brand through content volume", "hustle culture with emotional intelligence"]'::jsonb,
  persuasion_techniques = '["radical naming of audience self-deception without apology", "stream-of-consciousness delivery as authenticity signal", "documented business results as sole credibility source", "volume strategy — twelve claims per minute, some world-altering", "deliberate unpolished delivery signalling message over messenger"]'::jsonb,
  style_traits = '["racing pace creating feeling of witnessing live thought", "profanity as filter-removal signal", "self-interruption and mid-sentence topic pivots", "aggressive direct challenge of audience comfort stories", "no logical structure — pure associative chain following energy"]'::jsonb,
  perfect_for = 'Ideal for unfiltered authentic delivery, building business credibility through results rather than polish, and developing the confrontational naming of self-deception that creates loyal audiences.'
WHERE name = 'Gary Vaynerchuk';


-- ============================================================
-- SECTION 13: INSERT new curated speakers (21 new — total ~31)
-- sort_order starts at 11 continuing from existing 10.
-- ============================================================

INSERT INTO public.speakers
  (name, monogram, specialty, signature_trait, bio,
   ideal_wpm_min, ideal_wpm_max, ideal_pause_frequency, energy_profile,
   famous_speeches, learnings, sort_order, source_type,
   category_id, signature_phrases, common_themes, persuasion_techniques,
   style_traits, perfect_for)
VALUES

-- ── MOTIVATION (1 new — Eric Thomas) ──────────────────────

(
  'Eric Thomas', 'ET',
  'Street-to-Stage Preacher',
  'The Hip Hop Preacher',
  'Eric Thomas speaks at 145 to 175 WPM with a preacher''s rhythm that can surge into a full-volume declaration at emotional peaks, making him one of the most viscerally energetic motivational speakers alive. His signature technique is the extended hustle metaphor — drawn from sports, faith, and personal survival — that builds deliberately over several minutes toward a thunderous statement about hunger and sacrifice. Thomas weaponises his own story of homelessness and academic failure as living proof that desire outranks circumstance, giving his permission statements a credibility earned through documented suffering rather than theory. His phrase about wanting success as badly as you want to breathe has become arguably the most shared motivational line of the social media era.',
  145, 175, 'medium', 'explosive-preacher',
  '[{"title": "Secret to Success — Full Speech", "url": "#"}, {"title": "TGIM Series — Season 1", "url": "#"}, {"title": "You Owe You — Live Keynote", "url": "#"}]'::jsonb,
  '["Building emotional pressure through extended metaphor before release", "Using documented personal hardship as earned permission statement", "The preacher cadence — slow build to explosive declaration"]'::jsonb,
  11, 'curated',
  '11111111-1111-1111-1111-111111111101',
  '["When you want to succeed as bad as you want to breathe", "Pain is temporary", "Suffer now and live the rest of your life as a champion", "You owe you", "TGIM — Thank God It''s Monday"]'::jsonb,
  '["hunger and desire as the differentiating variable", "suffering as investment not punishment", "personal accountability over circumstance", "faith and work ethic as inseparable", "breaking generational limitation patterns"]'::jsonb,
  '["personal testimony as universal permission", "volume escalation as emotional signal", "rhetorical repetition of core phrase", "athletic metaphor for life principles", "direct accusation forcing personal accountability"]'::jsonb,
  '["sermon structure: slow build to explosive peak", "call-and-response cadence", "profanity for emphasis at emotional peaks", "rapid-fire declarations in final third", "extended metaphor constructed over multiple minutes"]'::jsonb,
  'Ideal for high-energy pep talks, pre-event motivation, and training environments where raw passion and earned testimony outperform polished technique.'
),

-- ── SALES (5 new) ──────────────────────────────────────────

(
  'Jordan Belfort', 'JB',
  'Straight Line Persuasion',
  'The Wolf Close',
  'Belfort speaks at 160 to 185 WPM with a high-voltage certainty that never wavers — his delivery calibrated to signal absolute conviction about every claim, a vocal posture that triggers trust in audiences regardless of content. His signature technique is the certainty stack: a series of rapid, inarguable statements that build momentum until the listener''s resistance to the next claim collapses under the weight of prior agreement. He constructed the Straight Line Persuasion system from his own experience closing under maximum pressure, making his instruction unusually specific and replicable by practitioners. Belfort''s vocal tonality framework — where the emotional certainty behind words matters more than the words themselves — has influenced an entire generation of sales trainers and closers.',
  160, 185, 'low', 'high-voltage-certain',
  '[{"title": "Straight Line Persuasion — Full System", "url": "#"}, {"title": "The Wolf of Wall Street — Motivational Talk", "url": "#"}, {"title": "Tonality Masterclass", "url": "#"}]'::jsonb,
  '["Tonality: communicating certainty independent of content", "The certainty stack for collapsing resistance", "The Straight Line — controlling every sales interaction"]'::jsonb,
  12, 'curated',
  '11111111-1111-1111-1111-111111111102',
  '["Act as if", "The sale is made in the first four seconds", "Straight line to the close", "Tonality is everything", "Every ''no'' is just a ''not yet''"]'::jsonb,
  '["tonality and certainty as the primary persuasion tool", "the straight line system", "threshold states and buying psychology", "objection handling as reframing not arguing", "the ten-point scale of certainty"]'::jsonb,
  '["certainty stacking to collapse resistance", "tonality control as vocal delivery discipline", "embedded commands in conversational structure", "future pacing into the outcome", "looping objections back to value"]'::jsonb,
  '["zero hesitation signals in delivery", "rapid confident pace with no wavering", "numbered frameworks delivered as doctrine", "role-play demonstration before principle explanation", "personal narrative of extreme success legitimising the system"]'::jsonb,
  'Ideal for learning sales tonality, certainty-based delivery, and the systematic closing frameworks that work under maximum buyer resistance.'
),

(
  'Grant Cardone', 'GC',
  '10X Sales Philosophy',
  '10X Amplifier',
  'Cardone speaks at 165 to 190 WPM — among the fastest in professional speaking — with a relentless amplification style where every claim is delivered at the highest possible intensity. His signature rhetorical move is the 10X reframe: whatever target or action the listener considers, Cardone argues it must be multiplied by ten, creating a framework that makes ordinary ambition feel like mathematical failure. He uses repetition not for rhythm but for saturation — the same principle stated four different ways until it bypasses scepticism through sheer volume of exposure. His physical delivery, characterised by aggressive forward lean and rapid gesturing, reinforces a vocal style that treats restraint as weakness and silence as weakness compounded.',
  165, 190, 'low', 'relentless-aggressive',
  '[{"title": "The 10X Rule — Full Keynote", "url": "#"}, {"title": "Be Obsessed or Be Average — Live", "url": "#"}, {"title": "Grant Cardone Sales Training University", "url": "#"}]'::jsonb,
  '["The 10X reframe: multiply every target by ten", "Obsession as the minimum viable work ethic", "Repetition saturation for bypassing audience resistance"]'::jsonb,
  13, 'curated',
  '11111111-1111-1111-1111-111111111102',
  '["10X everything", "Obsessed is a word the lazy use to describe the dedicated", "Success is your duty, obligation, and responsibility", "Average is a failing formula", "Massive action is the cure for everything"]'::jsonb,
  '["10X philosophy applied to every domain", "obsession over balance as the correct trade-off", "sales as the most important skill in any life", "financial abundance as a moral obligation", "activity level as the primary performance lever"]'::jsonb,
  '["extreme reframing of modest goals as failure", "shame of mediocrity as action trigger", "repetition saturation wearing down resistance", "personal financial metrics as sole credibility signal", "direct contrast of ordinary versus 10X behaviour"]'::jsonb,
  '["maximum energy maintained without modulation", "rapid restatement of key claim multiple ways", "personal financial results as authority not credentials", "direct challenge of audience comfort level", "high-volume declarative sentences with no qualifying"]'::jsonb,
  'Ideal for breaking self-imposed limits, building obsessive work intensity, and learning the high-saturation delivery style that overrides audience scepticism through sheer conviction.'
),

(
  'Brian Tracy', 'BT',
  'Sales Psychology Expert',
  'The Psychology Professor',
  'Tracy speaks at 130 to 150 WPM with the measured authority of a researcher who has tested every principle he teaches against documented results and found it sound. His signature technique is the scientific framework: he presents sales and personal development as applied psychology with predictable inputs and outputs, creating the impression that success is an engineering problem with a solved methodology available to anyone willing to apply it. Tracy constructs arguments in numbered sequences — seven keys, twelve laws, five steps — which creates memorable structure that audiences can immediately implement. His delivery is calm, precise, and entirely free of filler language, signalling a discipline of thought that few speakers at any level match.',
  130, 150, 'medium', 'methodical-confident',
  '[{"title": "The Psychology of Selling — Full Seminar", "url": "#"}, {"title": "Eat That Frog — Keynote", "url": "#"}, {"title": "Goals! — Live Workshop", "url": "#"}]'::jsonb,
  '["Numbered frameworks: structure that survives the listener''s note-taking", "Scientific credentialing of behavioural principles", "Zero filler language as a discipline and a signal"]'::jsonb,
  14, 'curated',
  '11111111-1111-1111-1111-111111111102',
  '["Eat that frog", "Your life only gets better when you get better", "The law of cause and effect is the iron law of the universe", "All successful people are big dreamers", "Move out of your comfort zone — you can only grow there"]'::jsonb,
  '["cause and effect as the foundation of all outcomes", "time management as the highest-leverage skill", "sales psychology and buyer behaviour", "goal-setting as a science with a methodology", "continuous self-improvement as competitive advantage"]'::jsonb,
  '["numbered frameworks for memorability and application", "scientific credentialing of behavioural principles", "behavioural specificity — never a principle without an action", "social proof through aggregate client results", "universal laws cited as authority anchors"]'::jsonb,
  '["zero filler language in any delivery", "precise numbered structure creating cognitive scaffolding", "calm authoritative register throughout", "academic citation style adapted for non-academic audience", "practical application stated immediately after every principle"]'::jsonb,
  'Ideal for learning systematic sales methodology, goal-setting frameworks, and developing the precision delivery style that builds authority through clarity and zero wasted words.'
),

(
  'Zig Ziglar', 'ZZ',
  'Ethical Sales & Motivation',
  'The Gentleman Closer',
  'Ziglar speaks at 140 to 165 WPM with the warm, evangelical rhythm of a Southern preacher who genuinely believes every word — an authenticity that gives his sales instruction a moral dimension most sales trainers never achieve. His signature technique is the story-close: a warm personal narrative that ends with a sales principle so naturally embedded the listener has adopted it before registering what occurred. Ziglar reframed selling not as manipulation but as service to people who need what you have, and this moral permission liberates his students from the psychological barrier that undermines most closers. His humour is gentle, self-deprecating, and strategically deployed to lower audience defences precisely before a key persuasion point lands.',
  140, 165, 'medium', 'warm-evangelical',
  '[{"title": "See You at the Top — Classic Recording", "url": "#"}, {"title": "Secrets of Closing the Sale — Seminar", "url": "#"}, {"title": "Born to Win — Live Event", "url": "#"}]'::jsonb,
  '["The story-close: embedding principle inside narrative", "Selling as service: the ethical reframe that unlocks conviction", "Humour as defences-down delivery mechanism"]'::jsonb,
  15, 'curated',
  '11111111-1111-1111-1111-111111111102',
  '["You can have everything in life you want if you help enough other people get what they want", "Your attitude, not your aptitude, will determine your altitude", "People don''t buy for logical reasons — they buy for emotional reasons", "Timid salespeople have skinny kids", "Every sale has five basic obstacles"]'::jsonb,
  '["selling as service not manipulation", "attitude as the primary sales instrument", "emotional buying psychology preceding logical justification", "integrity as the non-negotiable foundation of sales", "motivation and sales performance as inseparable"]'::jsonb,
  '["story-embedded principle delivery", "reframing selling as moral service", "gentle humour lowering resistance before insight", "logical then emotional sequencing", "call to moral action rather than tactical compliance"]'::jsonb,
  '["Southern storytelling rhythm with deliberate warmth", "self-deprecating humour at unexpected moments", "personal warm anecdote as the entry point for every principle", "principle revealed at the story''s natural peak", "patriotic and faith-based framing creating shared values"]'::jsonb,
  'Ideal for developing ethical sales conviction, mastering the story-close technique, and building the warm relational confidence that turns prospects into lifelong advocates.'
),

(
  'Johnny Miller', 'JM',
  'Consultative Sales & Revenue',
  'The Value-First Closer',
  'Miller speaks at 150 to 170 WPM with the direct, no-fluff cadence of a practitioner who learned sales through volume reps before ever building a training methodology. His core framework is value-first selling: every interaction begins by delivering genuine insight the prospect did not have before the conversation started, making the pivot to a pitch feel like a natural continuation of value rather than an interruption. He specialises in modern consultative selling and has adapted classic persuasion psychology for digital-first buyer journeys where traditional pressure tactics accelerate unsubscribe rates. Miller''s peer-positioning technique — speaking as a trusted advisor rather than a vendor seeking commission — produces a lower-resistance close environment that scales across channels.',
  150, 170, 'medium', 'direct-consultative',
  '[{"title": "Value-First Selling — Masterclass", "url": "#"}, {"title": "The Consultative Close — Workshop", "url": "#"}, {"title": "Modern Sales Psychology — Keynote", "url": "#"}]'::jsonb,
  '["Value-first: deliver insight before making any ask", "Peer positioning: advisor tone removing vendor resistance", "Modern consultative selling for digital buyer journeys"]'::jsonb,
  16, 'curated',
  '11111111-1111-1111-1111-111111111102',
  '["Lead with value, close with conviction", "The prospect already knows they need it — your job is to help them admit it", "Advice before ask, always", "Position yourself as a peer solving a problem, not a vendor making a pitch", "Insight is the new cold call"]'::jsonb,
  '["value delivery before any commercial ask", "consultative selling methodology", "modern buyer psychology in digital environments", "peer positioning as trust architecture", "pipeline development through content and insight"]'::jsonb,
  '["insight delivery creating psychological debt before pitch", "peer-framing removing commission-suspicion", "question-led discovery before solution presentation", "specific ROI framing making cost feel irrelevant", "social proof through specific client transformation stories"]'::jsonb,
  '["direct conversational pace with no performance signals", "question-heavy opening third", "specific client examples rather than aggregate claims", "advisor vocabulary not vendor vocabulary", "advice stated before the product connecting that advice is mentioned"]'::jsonb,
  'Ideal for learning consultative sales methodology, value-first communication, and the advisor-positioning technique that removes buyer resistance in digital-first environments.'
),

-- ── INFLUENCE (5 new) ──────────────────────────────────────

(
  'Andrew Tate', 'AT',
  'Provocative Influence',
  'The Controversy Engine',
  'Tate speaks at 150 to 175 WPM with a deliberately provocative delivery that uses extreme positions as an attention mechanism — a calculated strategy where controversy generates engagement and sharing that polished consensus-building cannot match. His rhetorical signature is the masculine challenge: direct accusations of weakness or mediocrity aimed at the listener, creating an uncomfortable confrontation the audience must either reject or act upon. He frames all success through the lens of dominance, control, and competitive advantage, using his documented achievements in kickboxing and business as credibility evidence for claims that would otherwise lack grounding. His delivery is relentlessly certain, deploying zero hedging language or qualification — a vocal posture that his audience reads as the confidence of someone who has tested his positions in the real world.',
  150, 175, 'low', 'provocative-dominant',
  '[{"title": "Emergency Meeting — Multiple Episodes", "url": "#"}, {"title": "The War Room Keynote", "url": "#"}, {"title": "Real World Business Training — Selected Lectures", "url": "#"}]'::jsonb,
  '["Controversy as an attention and sharing mechanism", "Masculine challenge: discomfort as the activation trigger", "Certainty delivery with zero hedging language"]'::jsonb,
  17, 'curated',
  '11111111-1111-1111-1111-111111111103',
  '["The matrix", "Most men are asleep", "Courage is doing it afraid", "Speed is the most important business trait", "Winners focus on winning, losers focus on winners"]'::jsonb,
  '["competitive dominance as the masculine ideal", "financial freedom as the primary life metric", "speed of execution over perfection", "network as the primary wealth vehicle", "self-reliance over institutional dependence"]'::jsonb,
  '["provocative framing generating emotional reaction", "documented extreme personal achievement as credibility", "masculine identity appeal", "in-group versus out-group consciousness building", "direct accusation of weakness forcing response"]'::jsonb,
  '["relentless certainty with zero qualification", "direct challenge framing creating fight-or-flight engagement", "rapid declarative delivery leaving no room for doubt", "personal achievement metrics stated as plain fact", "conversational tone making extreme claims feel self-evident"]'::jsonb,
  'Ideal for studying influence through provocation, certainty-based delivery mechanics, and understanding how controversy functions as an attention and identity-formation mechanism.'
),

(
  'Chris Voss', 'CV',
  'Negotiation & Tactical Empathy',
  'The Negotiator''s Whisper',
  'Voss speaks at 110 to 130 WPM in what he calls the late-night FM DJ voice — a deliberately slow, low, measured cadence functioning as a neurological calming signal that creates receptive relaxation before any persuasion attempt begins. His signature technique is tactical empathy: demonstrating such precise understanding of the counterpart''s position that defensive resistance drops before a single request is made. Voss draws every principle from documented FBI hostage negotiations, giving his influence instruction a life-or-death credibility that boardroom examples cannot match. His no-oriented question technique — framing proposals to invite a ''no'' response rather than fighting for ''yes'' — is among the most psychologically sophisticated and practically effective sales tools in current use.',
  110, 130, 'high', 'calm-tactical',
  '[{"title": "Never Split the Difference — Talks at Google", "url": "#"}, {"title": "MasterClass: The Art of Negotiation", "url": "#"}, {"title": "FBI Hostage Negotiation Principles — Keynote", "url": "#"}]'::jsonb,
  '["The late-night FM DJ voice: calm as neurological weapon", "Tactical empathy before any ask", "No-oriented questions: inviting ''no'' to unlock ''yes''"]'::jsonb,
  18, 'curated',
  '11111111-1111-1111-1111-111111111103',
  '["That''s right", "How am I supposed to do that?", "What about this doesn''t work for you?", "Seems like you''ve got a real challenge here", "I want you to feel heard on this"]'::jsonb,
  '["tactical empathy as the primary negotiation tool", "calibrated questions guiding counterpart thinking", "hostage negotiation principles in business context", "mirroring and labelling as rapport technology", "navigating high-stakes difficult conversations"]'::jsonb,
  '["mirroring for instant rapport", "labelling emotions to diffuse them before escalation", "calibrated questions replacing statements", "accusation audit preempting resistance", "deliberate vocal pacing as calming intervention"]'::jsonb,
  '["pace slowed to 60-70% of conversational norm", "voice dropping at moments of key insight", "long pauses after labelling to allow settling", "zero emotional reactivity regardless of content", "listening demonstrated through precise reflection before any response"]'::jsonb,
  'Ideal for high-stakes negotiations, difficult conversations, and learning the tactical empathy framework that influences without the counterpart ever feeling managed.'
),

(
  'Robert Cialdini', 'RC',
  'Influence Science & Psychology',
  'The Principles Professor',
  'Cialdini speaks at 120 to 140 WPM with the unhurried precision of an academic who knows that credibility is destroyed by speaking faster than the material warrants. His delivery approach is consistently demonstration-first: he tells an anecdote in which a principle of influence visibly operates in the real world, and only after the principle has been felt does he name and explain it, producing an aha moment rather than a lecture. The six principles of influence — reciprocity, commitment, social proof, authority, liking, and scarcity — function as both the content of his speeches and the structural method of delivering them. Four decades of peer-reviewed research sit behind every claim, yet his delivery strips academic jargon entirely, making the science accessible without sacrificing the rigour that gives it weight.',
  120, 140, 'medium', 'academic-warm',
  '[{"title": "Influence: The Psychology of Persuasion — Talks at Google", "url": "#"}, {"title": "Pre-Suasion — Keynote", "url": "#"}, {"title": "The 6 Principles of Influence — TED-style Talk", "url": "#"}]'::jsonb,
  '["Story before principle: anecdote makes the concept felt before it is named", "The six principles as both content and delivery structure", "Academic rigour stripped of jargon without losing credibility"]'::jsonb,
  19, 'curated',
  '11111111-1111-1111-1111-111111111103',
  '["Influence is the ability to have people say yes", "Social proof: people follow the lead of similar others", "Reciprocity: give first, always", "Scarcity: people want more of what they can have less of", "Pre-suasion: the moment before the ask is as important as the ask"]'::jsonb,
  '["the six principles of influence", "pre-suasion — attention management before persuasion", "social proof as the most powerful trigger", "unity as the seventh principle", "ethical influence versus manipulation"]'::jsonb,
  '["anecdote-first principle delivery", "scientific citation as authority anchor", "real-world case studies making principles tangible", "the six principles deployed within the speech itself", "ethical framing distinguishing influence from manipulation"]'::jsonb,
  '["measured academic pace signalling the research supports the claim", "warm conversational tone making science feel personal", "precise term introduction before application", "consistent returning to the same framework", "humour acknowledging the ironies of influence research"]'::jsonb,
  'Ideal for learning the science of ethical influence, understanding the six persuasion principles in practice, and developing the evidence-based delivery that commands intellectual authority.'
),

(
  'Patrick Bet-David', 'PB',
  'Entrepreneurship & Strategy',
  'The Framework Builder',
  'Bet-David speaks at 150 to 170 WPM with an entrepreneurial intensity that accelerates when he reaches the core of an argument, creating a felt sense that the idea itself is driving the delivery. His signature technique is the historical parallel: precise connections drawn between current business decisions and historical figures or events, lending contemporary choices the weight of proven patterns. Bet-David thinks and delivers in frameworks — numbered systems, comparative matrices, scenario trees — transforming ambiguous topics into actionable decision structures his audience can use immediately. His Iranian refugee origins and military service give his ambition narrative a specific earned credibility that purely wealthy speakers cannot manufacture.',
  150, 170, 'medium', 'entrepreneurial-intense',
  '[{"title": "The Life of an Entrepreneur in 90 Seconds", "url": "#"}, {"title": "Valuetainment — Most Viewed Episodes", "url": "#"}, {"title": "Your Next Five Moves — Keynote", "url": "#"}]'::jsonb,
  '["Historical parallel: connecting present decisions to proven historical patterns", "Framework delivery: turning ambiguity into structured decision tools", "Earned narrative: refugee-to-success story as credibility architecture"]'::jsonb,
  20, 'curated',
  '11111111-1111-1111-1111-111111111103',
  '["Your next five moves", "Predict the future by studying the past", "The entrepreneur''s DNA", "Know your why before your how", "Build a business, not just an income"]'::jsonb,
  '["strategic thinking as competitive advantage", "historical patterns predicting business outcomes", "entrepreneurship as identity not just activity", "building systems over grinding on tasks", "leadership development as the primary growth lever"]'::jsonb,
  '["historical parallel lending current decisions proven weight", "framework construction making complexity navigable", "refugee narrative establishing earned credibility", "direct challenge of employee versus owner mindset", "scenario tree showing consequences of each choice"]'::jsonb,
  '["intensity that accelerates at argument''s core", "whiteboard-style verbal structure", "historical figure examples cited with specific detail", "direct eye contact metaphor maintained through camera", "rapid framework delivery expecting audience to keep up"]'::jsonb,
  'Ideal for strategic thinking communication, framework-based teaching, and developing the historically-grounded delivery that makes business decisions feel inevitable rather than arbitrary.'
),

(
  'Alex Hormozi', 'AH',
  'Offer Creation & Business Growth',
  'The Offer Architect',
  'Hormozi speaks at 155 to 180 WPM with a systems-engineer''s precision — every sentence doing specific load-bearing work, no ornamental language present anywhere in his delivery. His signature technique is the value equation: reducing every offer, argument, and decision to a mathematical framework that makes the optimal choice feel obvious and the current position feel quantifiably irrational. Hormozi strips away motivational packaging entirely, speaking as if the audience is intelligent enough to act on pure logic and specific numbers — a respect-based persuasion model that generates unusual loyalty. His documented nine-figure business outcomes give his instruction a practitioner credibility that coaching-credential speakers consistently fail to match regardless of delivery quality.',
  155, 180, 'medium', 'direct-systematic',
  '[{"title": "$100M Offers — Core Framework Presentation", "url": "#"}, {"title": "Acquisition.com — Keynote Collection", "url": "#"}, {"title": "Gym Launch Secrets — Original Talk", "url": "#"}]'::jsonb,
  '["The value equation: reducing every decision to a mathematical framework", "Respect-based persuasion: logic and numbers over motivational packaging", "Practitioner credibility: outcomes as the only credential that matters"]'::jsonb,
  21, 'curated',
  '11111111-1111-1111-1111-111111111103',
  '["Make an offer so good people feel stupid saying no", "Volume of activity defeats talent every time", "The constraint is always one of three things", "Niche down until it hurts, then niche down more", "Your business is a reflection of you — fix you first"]'::jsonb,
  '["offer creation as the primary business lever", "value equation and perceived value construction", "sales as the bottleneck in most businesses", "scaling through systems not people", "self-improvement as the foundation of business improvement"]'::jsonb,
  '["mathematical value framing making cost feel irrelevant", "specific numbers and documented results as sole credibility", "direct instruction without motivation packaging", "framework reduction of complex business problems", "respect-based delivery assuming audience intelligence"]'::jsonb,
  '["zero ornamental language — every sentence load-bearing", "specific numbers over general claims always", "systems-thinking vocabulary applied to human behaviour", "direct instruction tone treating audience as practitioners not students", "calm certainty built on documented outcomes not confidence performance"]'::jsonb,
  'Ideal for offer-creation communication, mathematical value framing, and developing the practitioner-authority delivery that converts sceptical high-performers without motivational packaging.'
),

-- ── LEADERSHIP (2 new) ─────────────────────────────────────

(
  'Jocko Willink', 'JW',
  'Military Leadership & Discipline',
  'Extreme Ownership',
  'Willink speaks at 120 to 140 WPM with a controlled, unhurried military cadence that signals every word has been considered and every claim has been tested under conditions where being wrong was fatal. His signature principle is Extreme Ownership — the complete elimination of external blame from one''s vocabulary — delivered not as motivation but as operational doctrine drawn from documented Navy SEAL combat in Ramadi, Iraq. Willink''s most distinctive vocal habit is the deliberate pause before a key principle, creating a military briefing atmosphere where the audience understands something important is being stated once and not repeated. His emotional register rarely varies from composed authority, which makes the rare moments of visible intensity carry enormous weight that emotionally variable speakers cannot access.',
  120, 140, 'high', 'disciplined-commanding',
  '[{"title": "Extreme Ownership — Talks at Google", "url": "#"}, {"title": "Jocko Podcast — Selected Leadership Episodes", "url": "#"}, {"title": "The Dichotomy of Leadership — Keynote", "url": "#"}]'::jsonb,
  '["Extreme Ownership: total accountability as both doctrine and delivery signal", "Military brevity: doctrine stated once, completely, with full weight", "Composed authority: the emotional register that makes intensity land harder"]'::jsonb,
  22, 'curated',
  '11111111-1111-1111-1111-111111111104',
  '["Discipline equals freedom", "Extreme ownership", "Default aggressive", "Good", "Detach and observe"]'::jsonb,
  '["extreme ownership and radical personal accountability", "discipline as the mechanism of freedom", "leadership under pressure and in chaos", "decentralised command in complex environments", "combat-tested decision-making translated to business"]'::jsonb,
  '["combat narrative as irrefutable credibility anchor", "principle stated once with full deliberate weight", "absence of hedging language signalling earned certainty", "direct accountability challenge without softening", "logical consequence chains showing cost of non-ownership"]'::jsonb,
  '["military brevity — no sentence longer than needed", "deliberate pause before every key doctrine statement", "controlled monotone that breaks only for emphasis", "zero self-promotion or credibility-seeking language", "evidence always before principle, never after"]'::jsonb,
  'Ideal for building radical personal accountability, leadership under pressure communication, and the disciplined delivery style that commands attention through gravity rather than energy.'
),

(
  'Nelson Mandela', 'NM',
  'Moral Leadership & Reconciliation',
  'The Moral Giant',
  'Mandela speaks at 100 to 120 WPM with the measured, dignified cadence of someone who has been silent for 27 years and now selects every word as if it may be recorded for a century. His delivery carries a moral authority that transcends rhetoric — the credibility of absolute suffering combined with absolute forgiveness — giving even simple declarative sentences an emotional weight that trained orators cannot manufacture. Mandela''s most powerful technique is structural restraint: he makes fewer arguments than any situation seems to require, trusting that what he chooses to say carries more power through its sparseness than a fuller argument would. His inclusive language — our nation, we, together — creates a participatory vision where the audience is already inside the outcome being described.',
  100, 120, 'high', 'dignified-resolute',
  '[{"title": "Presidential Inauguration Address 1994", "url": "#"}, {"title": "Release from Prison Speech 1990", "url": "#"}, {"title": "Long Walk to Freedom — Selected Readings", "url": "#"}]'::jsonb,
  '["Structural restraint: power through what is not said", "Moral authority as the highest form of credibility", "Inclusive language: placing the audience inside the vision"]'::jsonb,
  23, 'curated',
  '11111111-1111-1111-1111-111111111104',
  '["It always seems impossible until it is done", "Education is the most powerful weapon to change the world", "I am the master of my fate, I am the captain of my soul", "Forgiveness liberates the soul — it removes fear", "A good head and a good heart are always a formidable combination"]'::jsonb,
  '["reconciliation over retribution as political doctrine", "the long game of freedom and human dignity", "education as the primary equality mechanism", "forgiveness as strength not surrender", "moral courage in the face of systemic opposition"]'::jsonb,
  '["moral authority built from documented sacrifice", "inclusive language dissolving us-versus-them", "structural restraint creating weight through selectivity", "forgiveness as the unexpected reversal of power", "historical consciousness framing every present action"]'::jsonb,
  '["unhurried dignity treating every word as consequential", "long deliberate pauses as reverence not hesitation", "simple direct sentences carrying the weight of history", "complete absence of self-serving language", "calm certainty earned through suffering rather than performance"]'::jsonb,
  'Ideal for understanding moral authority communication, inclusive leadership language, and the dignified restraint that makes sparse words carry the weight of a lifetime.'
),

-- ── STORYTELLING (5 new) ───────────────────────────────────

(
  'Matthew McConaughey', 'MM',
  'Philosophical Memoir & Life Story',
  'The Alright Philosopher',
  'McConaughey speaks at 110 to 135 WPM with a Southern drawl that functions as a storytelling instrument — slowing at emotional moments to create contemplative space, accelerating at moments of humour or discovery. His storytelling structure is the philosophical memoir: personal experience is not the destination but the vehicle for a larger observation about how life operates, and that observation arrives at the exact moment the listener has been conditioned to receive it. His greenlights philosophy — framing life''s obstacles as delayed advantages requiring recognition not resistance — is delivered not as doctrine but as a discovery the audience makes alongside him. His Oscar acceptance speech remains among the most studied in performance circles for its cadence, authenticity, and the rare feat of making prepared material feel genuinely lived-in.',
  110, 135, 'high', 'drawling-reflective',
  '[{"title": "Greenlights — Book Tour Talks", "url": "#"}, {"title": "Academy Award Acceptance Speech 2014", "url": "#"}, {"title": "University of Houston Commencement Address", "url": "#"}]'::jsonb,
  '["The philosophical memoir: personal story as vehicle for universal observation", "The drawl as instrument: pace as emotional signal not habit", "Discovery delivery: making prepared insights feel genuinely found in the moment"]'::jsonb,
  24, 'curated',
  '11111111-1111-1111-1111-111111111105',
  '["Alright, alright, alright", "Just keep living", "The greenlights in my life", "My hero is me in ten years", "Life''s barely long enough to get good at one thing"]'::jsonb,
  '["greenlights philosophy — obstacles as delayed advantage", "defining success on personal terms not external metrics", "life as a story worth living and telling", "the value of difficulty in retrospect", "identity and authenticity over performance and approval"]'::jsonb,
  '["philosophical discovery through personal narrative", "humour as disarmament before insight delivery", "slow contemplative build to key realisation", "self-referential authenticity as permission structure", "Southern anecdote as vehicle for universal truth"]'::jsonb,
  '["deliberate pauses before philosophical payoffs", "vocal drop into intimate register for revelations", "self-deprecating humour at unexpected structural moments", "spiral narrative rather than linear sequence", "total physical ease signalling complete ownership of material"]'::jsonb,
  'Ideal for developing authentic storytelling voice, philosophical delivery pacing, and the ability to transform personal experience into universal insight with effortless Southern cadence.'
),

(
  'Donald Miller', 'DM',
  'StoryBrand & Narrative Marketing',
  'The Story Architect',
  'Miller speaks at 130 to 150 WPM with the conversational precision of someone who has studied story structure so deeply that every sentence in his own delivery demonstrates the principles he is teaching. His signature framework is StoryBrand: positioning every audience or customer not as the hero but as the guide helping their customer-hero succeed — a reframe delivered with such gentle humour that the ego deflation feels like an upgrade. Miller''s delivery is warmly academic — Southern conversational ease wrapped around structural rigour built from mapping every story humans have collectively responded to across history. His ability to make narrative theory feel like natural conversation is among the most refined teaching skills in modern business communication.',
  130, 150, 'medium', 'conversational-structured',
  '[{"title": "Building a StoryBrand — Keynote", "url": "#"}, {"title": "Donald Miller at CreativeLive", "url": "#"}, {"title": "Hero on a Mission — Live Talk", "url": "#"}]'::jsonb,
  '["StoryBrand: guide not hero — the reframe that transforms marketing communication", "Structural teaching through performance: demonstrating the principle inside the speech", "Warmly academic: making narrative theory feel like common sense conversation"]'::jsonb,
  25, 'curated',
  '11111111-1111-1111-1111-111111111105',
  '["Clarify your message so customers can understand it", "If you confuse, you lose", "Position yourself as the guide, not the hero", "A story is a character who wants something and overcomes conflict to get it", "People don''t buy the best products — they buy the ones they can understand"]'::jsonb,
  '["StoryBrand framework for clear communication", "the guide versus hero positioning in business", "narrative structure applied to marketing and leadership", "clarity as the primary business communication virtue", "story as the operating system of human persuasion"]'::jsonb,
  '["framework delivery where the teaching method embodies the principle", "gentle humour making reframes feel generous not deflating", "story examples chosen for instant audience recognition", "structural clarity over rhetorical flourish", "academic theory translated into immediate practical application"]'::jsonb,
  '["conversational warmth preventing academic register from distancing", "framework named early then demonstrated throughout", "Southern storytelling ease with structural precision underneath", "constant practical application after every theoretical point", "self-aware humour about the irony of a storytelling teacher telling stories"]'::jsonb,
  'Ideal for learning narrative structure, StoryBrand communication methodology, and developing the warmly-precise delivery that makes complex frameworks immediately usable.'
),

(
  'Brené Brown', 'BB',
  'Vulnerability Research & Courage',
  'The Vulnerability Researcher',
  'Brown speaks at 140 to 160 WPM with a deceptive casualness that masks extraordinary structural precision — her stories appear spontaneous but are engineered to deliver research findings through emotional experience rather than data presentation. Her signature technique is the vulnerability bridge: a confession of personal failure or fear that is uncomfortably specific, creating an immediate trust that the audience feels compelled to meet with their own openness. Brown is the most influential academic-communicator of her generation because she made shame research — perhaps the driest possible academic subject — into a cultural phenomenon by making data personally felt rather than intellectually processed. Her rhythm is intimate and conspiratorial, as if she is sharing something the audience is not supposed to know but has always needed to hear.',
  140, 160, 'medium', 'vulnerable-academic',
  '[{"title": "The Power of Vulnerability — TED 2010", "url": "#"}, {"title": "Listening to Shame — TED 2012", "url": "#"}, {"title": "Dare to Lead — Keynote", "url": "#"}]'::jsonb,
  '["The vulnerability bridge: specific personal confession creating trust that audiences feel compelled to match", "Data through story: delivering research as felt experience not statistics", "Conspiratorial intimacy: the register that makes audiences feel chosen"]'::jsonb,
  26, 'curated',
  '11111111-1111-1111-1111-111111111105',
  '["Vulnerability is not weakness — it''s our greatest measure of courage", "Shame cannot survive being spoken", "We are wired for connection", "Daring greatly", "Clear is kind, unclear is unkind"]'::jsonb,
  '["vulnerability as the foundation of courage and connection", "shame resilience and the power of speaking it", "wholehearted living as both research finding and practice", "belonging versus fitting in as distinct experiences", "courage as a practised skill not a felt state"]'::jsonb,
  '["personal vulnerability as permission structure for audience openness", "research credibility before personal anecdote", "humour releasing shame tension before insight", "reframing weakness as data rather than character flaw", "collective identity through precise naming of shared unspoken experience"]'::jsonb,
  '["conspiratorial whisper register for key revelations", "genuine laughter at own confessions normalising imperfection", "data delivered through story never through statistics alone", "direct audience address creating individual accountability", "Southern warmth wrapped around academic precision"]'::jsonb,
  'Ideal for leaders building vulnerability-based trust, researchers communicating through story, and anyone whose message requires audiences to feel safe enough to lower their defences and truly hear.'
),

(
  'Will Smith', 'WS',
  'Life Philosophy & Character',
  'The Life Storyteller',
  'Smith speaks at 145 to 165 WPM with a cinematic storytelling instinct — structuring personal anecdotes as three-act narratives complete with inciting incidents, dark-night-of-the-soul moments, and resolution scenes that pay off earlier setups. His delivery oscillates dramatically between warm charismatic charm and gut-punch emotional honesty, creating a dynamic range that few professional speakers match across a single talk. Smith has become one of the most studied life-philosophy communicators because he discusses wealth, failure, ego, and purpose with a specificity and self-awareness that celebrity speakers typically avoid or package into palatable self-help. His willingness to describe psychological failures — perfectionism, ego, existential crises — with cinematic detail creates credibility that scripted success stories cannot generate.',
  145, 165, 'medium', 'charismatic-animated',
  '[{"title": "Will Smith — Goalcast Compilations", "url": "#"}, {"title": "On the Run II Tour — Spoken Word", "url": "#"}, {"title": "Will Smith: The Jump", "url": "#"}]'::jsonb,
  '["Cinematic three-act structure applied to personal anecdote", "Dynamic range: charm to gut-punch emotional honesty in one speech", "Psychological confession: naming ego and failure with cinematic specificity"]'::jsonb,
  27, 'curated',
  '11111111-1111-1111-1111-111111111105',
  '["The separation of two concepts: fault and responsibility", "Fear is not real", "Being realistic is the most commonly travelled road to mediocrity", "God placed the best things in life on the other side of fear", "Don''t chase the money — chase the passion"]'::jsonb,
  '["fear as a choice not an inevitability", "the separation of fault and responsibility as a life philosophy", "purpose over comfort as the operating principle", "ego as both engine and obstacle", "the paradox of fame and inner emptiness"]'::jsonb,
  '["cinematic story structure with deliberate act breaks", "charm-to-vulnerability pivot disarming defences", "specific ego confession removing celebrity pedestal", "fear reframing from danger signal to action trigger", "philosophical observation arrived at through story not stated directly"]'::jsonb,
  '["wide emotional range treated as storytelling tool not performance", "physical energy in delivery even without a body on screen", "specific named dialogue recounting real conversations", "philosophical humility despite documented extraordinary success", "punchy declarative sentences after long narrative build-up"]'::jsonb,
  'Ideal for developing cinematic personal storytelling, wide emotional register delivery, and the confessional authenticity that makes celebrity-level success stories feel accessible rather than alienating.'
),

(
  'Trevor Noah', 'TN',
  'Comedic Storytelling & Cultural Observation',
  'The Cultural Mirror',
  'Noah speaks at 145 to 170 WPM with a comedian''s timing precision — he knows exactly when the laugh is arriving and holds the pause long enough for the audience to get there themselves rather than being told it is funny. His storytelling vehicle is cultural observation: the specific vantage point of growing up mixed-race in apartheid South Africa used to illuminate universal human behaviours the audience has experienced but never quite had named for them. Noah''s most distinctive technique is the accent shift — voicing characters from different cultures in their authentic speech patterns, turning abstract cultural commentary into viscerally felt scene performance. His memoir-level narrative of South African origins gives his comedy a moral depth that separates him from purely observational comedians working in domestic references.',
  145, 170, 'medium', 'comedic-observational',
  '[{"title": "Born a Crime — Book Readings and Talks", "url": "#"}, {"title": "Daily Show — Selected Monologues", "url": "#"}, {"title": "Trevor Noah: Son of Patricia — Netflix Special", "url": "#"}]'::jsonb,
  '["The accent shift: voicing characters in their own patterns to make abstraction viscerally felt", "Timing precision: the pause that lets the audience arrive at the laugh themselves", "Cultural vantage point: outsider perspective naming what insiders cannot see"]'::jsonb,
  28, 'curated',
  '11111111-1111-1111-1111-111111111105',
  '["I am not African because I was born in Africa — I am African because Africa was born in me", "Language brings with it an identity", "Comedy is truth in a costume", "Racism teaches you to hate yourself", "The world doesn''t change all at once — it changes one story at a time"]'::jsonb,
  '["race and identity through the lens of lived contradiction", "language as identity and power mechanism", "the absurdity of systems examined through personal story", "cultural translation as both empathy tool and comedy device", "political and social commentary through lived experience"]'::jsonb,
  '["comedic timing as precise structural element not accident", "cultural observation making the familiar suddenly strange", "character voicing creating empathy through inhabitation", "moral gravity delivered inside the container of comedy", "personal story as evidence for broader cultural claim"]'::jsonb,
  '["deliberate pause held until audience laughter begins naturally", "vocal character switching between cultural accents without warning", "rapid escalation from warm story to absurdist observation", "genuine personal investment in the material preventing detachment", "structural discipline underneath apparent conversational ease"]'::jsonb,
  'Ideal for developing comedic timing precision, cultural observation storytelling, and the character-voicing technique that makes abstract social commentary land as felt personal experience.'
),

-- ── AUTHORITY (3 new) ──────────────────────────────────────

(
  'Joe Rogan', 'JR',
  'Long-Form Conversation & Culture',
  'The Long-Form Inquisitor',
  'Rogan speaks at 150 to 175 WPM in long-form conversational bursts that follow genuine curiosity rather than prepared talking points — creating the experience of watching a sharp mind work through a topic in real time alongside the audience. His authority model is curious interrogation rather than declarative expertise: he claims uncertainty openly, changes his position mid-conversation when evidence warrants, and uses questions to guide listeners through reasoning rather than conclusions. This intellectual honesty — unusual in media figures with his reach — creates a trust level that makes his audience unusually receptive to the experts and ideas he champions. His three-hour average conversation length has trained an audience comfortable with deep, unpackaged thinking that almost no short-form media can accommodate or replicate.',
  150, 175, 'medium', 'curious-intense',
  '[{"title": "Joe Rogan Experience — Top Episodes Compilation", "url": "#"}, {"title": "JRE with Elon Musk #1169", "url": "#"}, {"title": "Joe Rogan: Strange Times — Netflix Special", "url": "#"}]'::jsonb,
  '["Curious interrogation: authority through uncertainty not declaration", "Position change as credibility: updating publicly when evidence arrives", "Long-form patience: depth of attention as audience training"]'::jsonb,
  29, 'curated',
  '11111111-1111-1111-1111-111111111106',
  '["It''s entirely possible", "One hundred percent", "That''s fascinating to me", "Have you ever tried...", "Pull that up, Jamie"]'::jsonb,
  '["human performance and the limits of physical capacity", "psychedelics and altered states of consciousness", "martial arts as the operating system for life philosophy", "political and cultural commentary through conversation", "health optimisation and peak performance science"]'::jsonb,
  '["open intellectual curiosity as primary authority signal", "public position-change as credibility builder not weakness", "expert elevation through visible genuine fascination", "question-driven reasoning replacing declarative conclusion", "authenticity through zero corporate filtering"]'::jsonb,
  '["conversational not performative delivery", "genuine laughter used as punctuation and permission", "real-time intellectual processing visible in hesitation and revision", "zero institutional filtering creating safety for controversial topics", "physical ease translating to vocal ease and unguarded honesty"]'::jsonb,
  'Ideal for long-form conversational delivery, building authentic expertise authority through curiosity, and developing the honest intellectual persona that creates obsessive long-term audience loyalty.'
),

(
  'Lex Fridman', 'LF',
  'AI, Science & Philosophy',
  'The Philosophical Engineer',
  'Fridman speaks at 100 to 125 WPM with an almost monastic slowness that treats every word as carrying specific weight — his delivery style the verbal equivalent of a carefully placed footnote. His authority comes not from declared expertise but from demonstrated intellectual sincerity: he approaches every subject with genuine humility and rigorous preparation, signalling to guests and audiences alike that the truth of the subject matters more than the performance of understanding it. Fridman''s signature is the sincere question asked slowly, with visible emotional investment in the answer, creating conversational depth that performatively curious interviewers never achieve. His Russian accent and measured cadence produce a distinctive voice that listeners find simultaneously cerebral and deeply personal — an unusual combination in technical communication.',
  100, 125, 'high', 'cerebral-sincere',
  '[{"title": "Lex Fridman Podcast — Selected Conversations", "url": "#"}, {"title": "Introduction to Deep Learning — MIT 6.S191", "url": "#"}, {"title": "Lex Fridman: Meaning of Life Conversations", "url": "#"}]'::jsonb,
  '["Sincere question: emotional investment in the answer as depth signal", "Intellectual humility as authority: not knowing openly is the credential", "Monastic pacing: treating every word as load-bearing"]'::jsonb,
  30, 'curated',
  '11111111-1111-1111-1111-111111111106',
  '["What is the meaning of life to you?", "I love you and I appreciate you", "That''s a beautiful answer", "What gives you hope for the future?", "Love is the answer — to everything"]'::jsonb,
  '["artificial intelligence and the nature of consciousness", "love and human connection as the foundation of meaning", "physics and the deep structure of reality", "martial arts and discipline as philosophy", "the future of civilisation and existential risk"]'::jsonb,
  '["extreme sincerity as disarmament", "slow deliberate questioning as intellectual respect signal", "vulnerability about own fears normalising uncertainty", "deep preparation elevating guests visibly", "philosophical framing of technical topics creating broader resonance"]'::jsonb,
  '["long contemplative silences before questions treated as content not dead air", "emotional intensity through stillness not volume", "first-principles thinking made visible in delivery", "self-deprecating intellectual humility disarming expert defensiveness", "sustained eye-contact intensity signalling total present-moment engagement"]'::jsonb,
  'Ideal for developing intellectual authority through sincerity, mastering the deliberate slow delivery that commands deep attention, and building the contemplative gravitas that complex subjects demand.'
),

(
  'Naval Ravikant', 'NR',
  'Wealth, Happiness & Philosophy',
  'The Wealth Philosopher',
  'Ravikant speaks at 115 to 135 WPM with a meditative precision that treats each sentence as a complete unit of thought — he does not ramble, qualify excessively, or repeat, which gives every statement an epigrammatic density that rewards careful listening and repeated review. His authority is constructed entirely from the quality of ideas rather than credentials, institutional affiliation, or social proof, making his persuasion model one of the purest examples of content-as-credibility in modern communication. Naval''s delivery is the closest contemporary approximation to a practising Stoic philosopher: calm, unhurried, free of emotional manipulation, containing observations that feel obvious in retrospect but were invisible before he articulated them. His framework for wealth and happiness — separating specific knowledge from commoditised skills, separating happiness from craving — has been studied with the seriousness typically reserved for formal philosophy.',
  115, 135, 'high', 'meditative-precise',
  '[{"title": "Naval Ravikant on the Tim Ferriss Show", "url": "#"}, {"title": "How to Get Rich — Tweetstorm Podcast", "url": "#"}, {"title": "The Almanack of Naval Ravikant — Audio", "url": "#"}]'::jsonb,
  '["Aphoristic compression: entire philosophies in one sentence", "Content-as-sole-credibility: ideas with no institutional backing", "Meditative pacing: treating thinking pauses as content not gaps"]'::jsonb,
  31, 'curated',
  '11111111-1111-1111-1111-111111111106',
  '["Specific knowledge can''t be taught, only learned", "Seek wealth, not money or status", "Play long-term games with long-term people", "Happiness is a choice you make and a skill you develop", "Code and media are the leverage of this century"]'::jsonb,
  '["wealth creation through specific knowledge and leverage", "happiness as a practised skill not a condition to be achieved", "the distinction between money, status, and wealth", "reading and compounding knowledge as the primary investment", "self-awareness as the precondition of every other virtue"]'::jsonb,
  '["aphoristic compression of complex ideas into single sentences", "content quality as the sole credibility signal", "framework presentation without emotional manipulation", "invitation to think alongside rather than follow", "Stoic emotional detachment creating rare intellectual authority"]'::jsonb,
  '["complete sentences functioning as standalone insights", "zero rhetorical flourish or delivery performance", "calm maintained regardless of topic intensity or provocation", "thinking pauses treated as valuable content not gaps to fill", "absence of all social proof signals trusting ideas to stand alone"]'::jsonb,
  'Ideal for developing aphoristic precision, philosophical delivery authority, and the meditative vocal presence that makes complex ideas about wealth and happiness land as simple, obvious truths.'
);


-- ============================================================
-- END OF MIGRATION 005
-- ============================================================
