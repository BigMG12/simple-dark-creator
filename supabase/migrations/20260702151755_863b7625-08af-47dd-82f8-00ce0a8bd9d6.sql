
-- ========== 1. conversations table ==========
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url text NOT NULL,
  audio_mime_type text,
  conversation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  duration_seconds numeric,
  context_stakes text,
  context_goal text,
  context_other_party text,
  diarization_data jsonb,
  transcript_full text,
  transcript_user_only text,
  user_speaker_label text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_delete_own" ON public.conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_conversations_user_created ON public.conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_status ON public.conversations(status) WHERE status IN ('pending','diarizing','awaiting_speaker_selection','analyzing');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== 2. conversation_analyses table ==========
CREATE TABLE public.conversation_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_type text NOT NULL,
  overall_score integer NOT NULL,
  talk_time_ratio numeric,
  type_specific_metrics jsonb,
  timeline_events jsonb,
  moments_of_truth jsonb,
  improvement_tips jsonb,
  feedback_summary text,
  scorecard jsonb,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_analyses TO authenticated;
GRANT ALL ON public.conversation_analyses TO service_role;

ALTER TABLE public.conversation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_analyses_select_own" ON public.conversation_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Inserts/updates only via service_role from edge functions.

CREATE INDEX idx_conversation_analyses_user_created ON public.conversation_analyses(user_id, created_at DESC);

CREATE TRIGGER conversation_analyses_set_updated_at
BEFORE UPDATE ON public.conversation_analyses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== 3. Storage bucket policies (bucket created via tool) ==========
-- Owner-only access to objects under conversations/{user_id}/...
CREATE POLICY "conversations_storage_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'conversations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "conversations_storage_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'conversations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "conversations_storage_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'conversations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "conversations_storage_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'conversations' AND (storage.foldername(name))[1] = auth.uid()::text);
