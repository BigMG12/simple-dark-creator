-- ============================================================
-- BIG SPEAKING — Style Matching & Category Analysis
-- Migration: 005_style_matching.sql
--
-- Applies on top of 004_*.sql migrations.
-- Safe to re-run: all DDL is idempotent.
--
-- What this migration does:
--   1. Enables pgvector extension.
--   2. Creates speaker_categories table with analysis_lens JSONB.
--   3. Creates speech_embeddings table for mentor vector chunks.
--   4. Extends speakers with category FK, signature_phrases,
--      persuasion_techniques, style_traits.
--   5. Extends analyses with category_metrics, style_match_score,
--      style_match_breakdown, mentor_alternative_phrasing,
--      signature_phrases_used.
--   6. Adds RLS policies for the two new tables.
--   7. Creates the match_speech_embeddings RPC function.
-- ============================================================


-- ============================================================
-- 1. EXTENSION: pgvector
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================
-- 2. TABLE: speaker_categories
--
-- Each row is a speaking style archetype (e.g. "Motivational",
-- "Philosophical"). The analysis_lens JSONB drives the GPT
-- category-specific analysis prompt and its output schema.
--
-- Example analysis_lens:
-- {
--   "ai_focus_prompt": "You are analysing a motivational speech...",
--   "dimensions": [
--     { "key": "urgency_score",   "label": "Urgency",     "description": "How urgently the speaker conveys the message", "scale": [0, 100] },
--     { "key": "authority_score", "label": "Authority",   "description": "Degree of confident, commanding presence",    "scale": [0, 100] }
--   ]
-- }
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speaker_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  -- Full JSONB lens — see structure above
  analysis_lens JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. TABLE: speech_embeddings
--
-- Stores text-embedding-3-small vectors for mentor speech chunks.
-- Populated offline by a separate ingestion job, not by the
-- analyze-recording function.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speech_embeddings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID        NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  chunk_text TEXT        NOT NULL,
  -- text-embedding-3-small default dimension: 1536
  embedding  vector(1536) NOT NULL,
  -- Optional source reference for provenance (URL, speech title, etc.)
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index: best trade-off for up to ~1 M rows.
-- lists = sqrt(expected row count). Adjust after data grows.
CREATE INDEX IF NOT EXISTS idx_speech_embeddings_speaker
  ON public.speech_embeddings (speaker_id);

CREATE INDEX IF NOT EXISTS idx_speech_embeddings_ivfflat
  ON public.speech_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- ============================================================
-- 4. EXTEND: speakers
-- ============================================================

ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS category_id            UUID   REFERENCES public.speaker_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_phrases      JSONB  NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS persuasion_techniques  JSONB  NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS style_traits           JSONB  NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_speakers_category
  ON public.speakers (category_id);


-- ============================================================
-- 5. EXTEND: analyses
--
-- All new columns are nullable — existing rows are unaffected.
-- ============================================================

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS category_metrics            JSONB,
  ADD COLUMN IF NOT EXISTS style_match_score           NUMERIC CHECK (style_match_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS style_match_breakdown       JSONB,
  ADD COLUMN IF NOT EXISTS mentor_alternative_phrasing TEXT,
  ADD COLUMN IF NOT EXISTS signature_phrases_used      JSONB;


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.speaker_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_embeddings  ENABLE ROW LEVEL SECURITY;

-- speaker_categories: read-only for authenticated users (like speakers)
DROP POLICY IF EXISTS "speaker_categories: select authenticated" ON public.speaker_categories;
CREATE POLICY "speaker_categories: select authenticated"
  ON public.speaker_categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- speech_embeddings: read-only for authenticated users
DROP POLICY IF EXISTS "speech_embeddings: select authenticated" ON public.speech_embeddings;
CREATE POLICY "speech_embeddings: select authenticated"
  ON public.speech_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- 7. RPC: match_speech_embeddings
--
-- Takes a speaker UUID, a query embedding (from user's transcript),
-- and a sample count. Returns p_match_count randomly-sampled chunks
-- from that speaker's embeddings together with their cosine
-- similarity to the query vector.
--
-- The caller (Edge Function) receives the rows, sorts by similarity
-- DESC, and averages the top 10 to produce the cadence/style score.
--
-- Random sampling avoids always comparing against the same subset
-- of a speaker's corpus (different speeches, different topics).
--
-- Similarity = 1 - cosine_distance. Range: -1..1; for text
-- embeddings in practice 0..1.
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_speech_embeddings(
  p_speaker_id   UUID,
  p_embedding    vector(1536),
  p_match_count  INT DEFAULT 20
)
RETURNS TABLE(
  id         UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    se.id,
    se.chunk_text,
    1 - (se.embedding <=> p_embedding) AS similarity
  FROM public.speech_embeddings se
  WHERE se.speaker_id = p_speaker_id
  ORDER BY RANDOM()
  LIMIT p_match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_speech_embeddings(UUID, vector, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_speech_embeddings(UUID, vector, INT) TO service_role;
