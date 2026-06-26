-- ============================================================
-- FIX: Auto-assign default speaker in handle_new_user trigger
-- Problem: New users don't get selected_speaker_id set automatically
-- Solution: Select speaker with lowest sort_order and assign it
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_speaker_id UUID;
BEGIN
  -- Get default speaker (lowest sort_order)
  SELECT id INTO default_speaker_id
  FROM public.speakers
  ORDER BY sort_order ASC
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, selected_speaker_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    default_speaker_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger already exists, no need to recreate
