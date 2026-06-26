-- ============================================================
-- BIG SPEAKING — Deep Mentor DNA v2 — Archiwizacja
-- Migration: 050_deep_mentor_dna_v2_archive.sql
-- ============================================================

-- ============================================================
-- SECTION 1: Tworzenie tabeli archiwum
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speakers_archive (
  LIKE public.speakers INCLUDING ALL
);

-- Dodaj kolumnę archived_at
ALTER TABLE public.speakers_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON TABLE public.speakers_archive IS
'Archiwum speakers usuniętych z głównej tabeli - zachowuje pełną historię';

COMMENT ON COLUMN public.speakers_archive.archived_at IS
'Timestamp archiwizacji speakera';


-- ============================================================
-- SECTION 2: Archiwizacja 4 speakers
-- ============================================================

-- Przenieś speakers którzy NIE są na liście FINAL 10
INSERT INTO public.speakers_archive
SELECT *
FROM public.speakers
WHERE name IN (
  'Martin Luther King Jr.',
  'Les Brown',
  'Mel Robbins',
  'Gary Vaynerchuk'
);

-- Update archived_at timestamp
UPDATE public.speakers_archive
SET archived_at = NOW()
WHERE archived_at IS NULL;

-- Potwierdzenie archiwizacji
DO $$
DECLARE
  archived_count INT;
BEGIN
  SELECT COUNT(*) INTO archived_count
  FROM public.speakers_archive
  WHERE name IN (
    'Martin Luther King Jr.',
    'Les Brown',
    'Mel Robbins',
    'Gary Vaynerchuk'
  );

  RAISE NOTICE 'Zarchiwizowano % speakers', archived_count;
END $$;


-- ============================================================
-- SECTION 3: Dodanie nowych speakers (szkielety)
-- ============================================================

-- Jordan Belfort
INSERT INTO public.speakers
  (name, specialty, signature_trait, bio,
   ideal_wpm_min, ideal_wpm_max, ideal_pause_frequency, energy_profile,
   famous_speeches, learnings, monogram, sort_order)
VALUES
(
  'Jordan Belfort',
  'Sales & Persuasion Mastery',
  'The Straight Line System',
  'Jordan Belfort — znany jako Wilk z Wall Street — zbudował imperium sprzedażowe Stratton Oakmont, osiągając legendarne wyniki przez opanowanie psychologii sprzedaży i kontroli tonalności głosu. Jego "Straight Line System" to precyzyjna metodologia prowadzenia klienta od pierwszego kontaktu do zamknięcia sprzedaży, eliminując chaos i zastępując go strukturą. Belfort uczy że sprzedaż to nie manipulacja — to służba przez pomoc w podejmowaniu decyzji. Jego energia jest dzika ale kontrolowana, tempo szybkie ale z dramatycznymi pauzami przy kluczowych momentach. Każde słowo ma cel, każda pauza sprzedaje.',
  180, 220, 'medium',
  'Aggressive warmth — wysoka energia z wybuchami intensywności przy key points',
  '[]'::jsonb,
  '[]'::jsonb,
  'JB', 11
),

-- Chris Voss
(
  'Chris Voss',
  'Negotiation & Tactical Empathy',
  'The Calibrated Question',
  'Chris Voss to były główny negocjator FBI ds. zakładników, który przez 24 lata prowadził najbardziej krytyczne negocjacje na świecie — od porwań międzynarodowych po kryzysy terrorystyczne. Jego podejście opiera się na "tactical empathy" — głębokim zrozumieniu emocji drugiej strony nie jako słabości, ale jako narzędzia wpływu. Voss mówi spokojnie, celowo, z chirurgiczną precyzją w doborze słów. Jego "calibrated questions" to pytania zaprojektowane tak, by druga strona sama doszła do wniosku który Ty chcesz zaszczepić. Nie przekonujesz — prowadzisz rozmówcę do samoprzyznania. Jego głos jest głęboki, uspokajający, ale każde zdanie niesie ukryty cel strategiczny.',
  90, 120, 'high',
  'Calm, deliberate, surgical — intensywność ukryta pod spokojem',
  '[]'::jsonb,
  '[]'::jsonb,
  'CV', 12
),

-- Alex Hormozi
(
  'Alex Hormozi',
  'Value Creation & Business Scaling',
  'The Value Equation',
  'Alex Hormozi zbudował i sprzedał kilka firm za dziesiątki milionów dolarów, a następnie pomógł tysiącom przedsiębiorców przeskalować ich biznesy przez Acquisition.com. Jego podejście opiera się na "Value Equation" — matematycznym frameworku pokazującym jak zwiększyć percepowaną wartość oferty bez zmiany ceny. Hormozi mówi szybko, konkretnie, bez filler words — każde zdanie to actionable insight. Nie ma czasu na teorię, filozofię ani motivational fluff. Tylko: co działa, co nie działa, dlaczego, i co z tym zrobić. Jego feedback jest brutalnie szczery ale zawsze oparty na liczbach i mechanice biznesowej. Jeśli coś nie generuje ROI — wyrzucasz. Jeśli generuje — skalujesz. Punkt.',
  140, 180, 'low',
  'High-intensity, rapid-fire, zero-bullshit energy',
  '[]'::jsonb,
  '[]'::jsonb,
  'AH', 13
),

-- The Top G (Andrew Tate)
(
  'The Top G',
  'Dominance & Frame Control',
  'Unshakeable Frame',
  'Andrew Tate — znany jako The Top G — to były mistrz świata kickboxingu, przedsiębiorca i jedna z najbardziej polaryzujących postaci internetu. Jego filozofia opiera się na absolutnej dominacji ramki (frame control) — kto kontroluje ramę rozmowy, kontroluje wynik. Tate mówi z nieustępliwą pewnością siebie, zero wątpliwości, zero przeprosin. Każde zdanie to deklaracja siły. Nie prosi o zgodę, nie szuka aprobaty — stwierdza fakty i czeka aż rzeczywistość się dostosuje. Jego energia jest chłodna ale intensywna, jak drapieżnik który nie musi się spieszyć bo wie że ofiara i tak nie ucieknie. Używa prowokacji, hiperboli i kontrastu (bogaci vs biedni, alfa vs beta) żeby zmusić słuchacza do wyboru strony. Nie ma neutralności.',
  120, 160, 'medium',
  'Cold dominance — kontrolowana intensywność z wybuchami prowokacji',
  '[]'::jsonb,
  '[]'::jsonb,
  'TG', 14
);


-- ============================================================
-- SECTION 4: Potwierdzenie stanu
-- ============================================================

DO $$
DECLARE
  active_count INT;
  archived_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count FROM public.speakers;
  SELECT COUNT(*) INTO archived_count FROM public.speakers_archive;

  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'STAN PO MIGRACJI 050:';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Aktywnych speakers: %', active_count;
  RAISE NOTICE 'Zarchiwizowanych speakers: %', archived_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
