#!/bin/bash
# Script to generate final migration with injected mentor profiles

MIGRATION_FILE="supabase/migrations/051_deep_mentor_dna_v2_inject.sql"
TEMP_FILE="supabase/migrations/051_deep_mentor_dna_v2_inject_temp.sql"
MENTORS_DIR="supabase/seeds/mentors_v2"

echo "Generating migration with mentor profiles..."

# Start with header
cat > "$TEMP_FILE" << 'EOF'
-- ============================================================
-- BIG SPEAKING — Deep Mentor DNA v2 — Injection
-- Migration: 051_deep_mentor_dna_v2_inject.sql
--
-- Wstrzykuje 12-warstwowe profile mentorów do bazy danych
-- i przypisuje kategorie
-- ============================================================

EOF

# Function to escape single quotes for SQL
escape_json() {
    sed "s/'/''/g" "$1"
}

# Jordan Belfort
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 1: Update Jordan Belfort" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/01_belfort.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'sales')" >> "$TEMP_FILE"
echo "WHERE name = 'Jordan Belfort';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Chris Voss
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 2: Update Chris Voss" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/02_voss.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'influence')" >> "$TEMP_FILE"
echo "WHERE name = 'Chris Voss';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Alex Hormozi
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 3: Update Alex Hormozi" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/03_hormozi.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'sales')" >> "$TEMP_FILE"
echo "WHERE name = 'Alex Hormozi';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Tony Robbins
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 4: Update Tony Robbins" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/04_robbins.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'motivation')" >> "$TEMP_FILE"
echo "WHERE name = 'Tony Robbins';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# David Goggins
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 5: Update David Goggins" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/05_goggins.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'motivation')" >> "$TEMP_FILE"
echo "WHERE name = 'David Goggins';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Steve Jobs
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 6: Update Steve Jobs" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/06_jobs.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'leadership')" >> "$TEMP_FILE"
echo "WHERE name = 'Steve Jobs';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Barack Obama
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 7: Update Barack Obama" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/07_obama.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'leadership')" >> "$TEMP_FILE"
echo "WHERE name = 'Barack Obama';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Simon Sinek
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 8: Update Simon Sinek" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/08_sinek.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'storytelling')" >> "$TEMP_FILE"
echo "WHERE name = 'Simon Sinek';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Jordan Peterson
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 9: Update Jordan Peterson" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/09_peterson.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'authority')" >> "$TEMP_FILE"
echo "WHERE name = 'Jordan Peterson';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# The Top G
echo "-- ============================================================" >> "$TEMP_FILE"
echo "-- SECTION 10: Update The Top G" >> "$TEMP_FILE"
echo "-- ============================================================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "UPDATE public.speakers" >> "$TEMP_FILE"
echo "SET" >> "$TEMP_FILE"
echo -n "  persona_profile = '" >> "$TEMP_FILE"
escape_json "$MENTORS_DIR/10_tate.json" >> "$TEMP_FILE"
echo "'::jsonb," >> "$TEMP_FILE"
echo "  persona_version = 2," >> "$TEMP_FILE"
echo "  category_id = (SELECT id FROM public.speaker_categories WHERE name = 'sales')" >> "$TEMP_FILE"
echo "WHERE name = 'The Top G';" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Verification
cat >> "$TEMP_FILE" << 'EOF'
-- ============================================================
-- SECTION 11: Verification
-- ============================================================

DO $$
DECLARE
  updated_count INT;
  profile_lengths TEXT;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.speakers
  WHERE persona_version = 2;

  SELECT string_agg(
    name || ': ' || length(persona_profile::text) || ' chars',
    E'\n'
  ) INTO profile_lengths
  FROM public.speakers
  WHERE persona_version = 2
  ORDER BY name;

  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'DEEP MENTOR DNA v2 INJECTION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Updated speakers: %', updated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Profile lengths:';
  RAISE NOTICE '%', profile_lengths;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
EOF

# Replace original file
mv "$TEMP_FILE" "$MIGRATION_FILE"

echo "Migration generated successfully: $MIGRATION_FILE"
echo "File size: $(wc -c < "$MIGRATION_FILE") bytes"
