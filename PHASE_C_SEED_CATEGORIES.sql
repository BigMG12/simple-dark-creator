-- ═══════════════════════════════════════════════════════════════
-- FAZA C — SEED DATA DLA SPEAKER_CATEGORIES
-- ═══════════════════════════════════════════════════════════════
-- UWAGA: speakers.category_id to TEXT, więc używamy TEXT ID zamiast UUID

INSERT INTO speaker_categories (id, name, analysis_lens, primary_metrics_this_mentor_cares_about)
VALUES
  -- 1. MOTIVATION
  (
    gen_random_uuid(),
    'Motivation',
    '{
      "focus": "Inspiracja, energia, przełamywanie barier mentalnych",
      "key_questions": [
        "Czy mówca buduje momentum emocjonalny?",
        "Czy używa historii osobistych do budowania relacji?",
        "Czy wzywa do działania (call-to-action)?"
      ],
      "style_markers": ["energia", "emocje", "storytelling", "wyzwania"]
    }'::jsonb,
    '["energy_variance_score", "pause_mastery_score", "clarity_score"]'::jsonb
  ),

  -- 2. SALES
  (
    gen_random_uuid(),
    'Sales',
    '{
      "focus": "Perswazja, budowanie wartości, zamykanie transakcji",
      "key_questions": [
        "Czy mówca adresuje obiekcje?",
        "Czy buduje pilność (urgency)?",
        "Czy używa technik zamykania sprzedaży?"
      ],
      "style_markers": ["konkretność", "benefity", "proof", "urgency"]
    }'::jsonb,
    '["clarity_score", "vocabulary_depth_score", "pause_mastery_score"]'::jsonb
  ),

  -- 3. INFLUENCE
  (
    gen_random_uuid(),
    'Influence',
    '{
      "focus": "Budowanie autorytetu, cialdini principles, social proof",
      "key_questions": [
        "Czy mówca używa zasad wpływu społecznego?",
        "Czy buduje wiarygodność przez ekspertyzę?",
        "Czy stosuje techniki reciprocity/scarcity?"
      ],
      "style_markers": ["autorytet", "dowody społeczne", "konsystencja", "sympatia"]
    }'::jsonb,
    '["vocabulary_depth_score", "clarity_score", "overall_score"]'::jsonb
  ),

  -- 4. LEADERSHIP
  (
    gen_random_uuid(),
    'Leadership',
    '{
      "focus": "Wizja, inspirowanie zespołów, podejmowanie decyzji",
      "key_questions": [
        "Czy mówca komunikuje jasną wizję?",
        "Czy buduje zaufanie i odpowiedzialność?",
        "Czy używa języka inkluzywnego (my vs. I)?"
      ],
      "style_markers": ["wizja", "odpowiedzialność", "decyzyjność", "empatia"]
    }'::jsonb,
    '["clarity_score", "pause_mastery_score", "vocabulary_depth_score"]'::jsonb
  ),

  -- 5. STORYTELLING
  (
    gen_random_uuid(),
    'Storytelling',
    '{
      "focus": "Narracja, struktura opowieści, emocjonalne zaangażowanie",
      "key_questions": [
        "Czy mówca używa struktury hero journey?",
        "Czy buduje napięcie i rozwiązanie?",
        "Czy używa detali sensorycznych?"
      ],
      "style_markers": ["narracja", "detale", "emocje", "struktura"]
    }'::jsonb,
    '["vocabulary_depth_score", "pause_mastery_score", "energy_variance_score"]'::jsonb
  ),

  -- 6. AUTHORITY
  (
    gen_random_uuid(),
    'Authority',
    '{
      "focus": "Ekspertyza, pewność siebie, command presence",
      "key_questions": [
        "Czy mówca demonstruje głęboką wiedzę?",
        "Czy używa precyzyjnego języka technicznego?",
        "Czy komunikuje z pewnością siebie?"
      ],
      "style_markers": ["precyzja", "pewność", "ekspertyza", "command"]
    }'::jsonb,
    '["clarity_score", "vocabulary_depth_score", "overall_score"]'::jsonb
  );

-- Weryfikacja
SELECT id, name,
       jsonb_array_length(primary_metrics_this_mentor_cares_about) as metrics_count
FROM speaker_categories
ORDER BY name;
