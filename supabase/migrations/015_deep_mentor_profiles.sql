-- ============================================================
-- BIG SPEAKING — Deep Mentor Profiles Migration
-- Rozszerza schemat speakers o bogate profile persona
-- oraz archiwizuje snapshoty person w analizach
-- ============================================================

-- ============================================================
-- SECTION 1: Rozszerzenie tabeli speakers
-- ============================================================

-- Dodaj kolumnę persona_profile dla pełnego JSON profilu mentora
ALTER TABLE public.speakers
ADD COLUMN IF NOT EXISTS persona_profile JSONB DEFAULT NULL;

-- Dodaj kolumnę persona_version dla trackowania wersji profilu
ALTER TABLE public.speakers
ADD COLUMN IF NOT EXISTS persona_version INT DEFAULT 1;

-- Dodaj indeks GIN dla szybkich queries po podpolach JSON
CREATE INDEX IF NOT EXISTS idx_speakers_persona_profile_gin
ON public.speakers USING GIN (persona_profile);

-- Dodaj indeks na persona_version dla filtrowania
CREATE INDEX IF NOT EXISTS idx_speakers_persona_version
ON public.speakers (persona_version);

COMMENT ON COLUMN public.speakers.persona_profile IS
'Pełny JSON profil mentora zawierający: core_identity, communication_style, expertise_domains, teaching_approach, personality_traits, feedback_patterns, motivational_techniques, challenge_design, growth_philosophy, interaction_examples';

COMMENT ON COLUMN public.speakers.persona_version IS
'Wersja profilu persona - pozwala trackować zmiany w czasie';


-- ============================================================
-- SECTION 2: Rozszerzenie tabeli analyses
-- ============================================================

-- Dodaj kolumnę mentor_persona_snapshot dla archiwizacji
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS mentor_persona_snapshot JSONB DEFAULT NULL;

-- Dodaj indeks GIN dla queries po snapshot
CREATE INDEX IF NOT EXISTS idx_analyses_mentor_persona_snapshot_gin
ON public.analyses USING GIN (mentor_persona_snapshot);

COMMENT ON COLUMN public.analyses.mentor_persona_snapshot IS
'Snapshot persona_profile mentora z momentu analizy - zapewnia spójność historyczną nawet po update mentora';


-- ============================================================
-- SECTION 3: Funkcja pomocnicza do kopiowania snapshotu
-- ============================================================

-- Funkcja automatycznie kopiuje persona_profile do snapshot przy tworzeniu analizy
CREATE OR REPLACE FUNCTION public.copy_mentor_persona_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Jeśli analiza ma przypisanego mentora, skopiuj jego persona_profile
  IF NEW.compared_to_speaker_id IS NOT NULL THEN
    SELECT persona_profile INTO NEW.mentor_persona_snapshot
    FROM public.speakers
    WHERE id = NEW.compared_to_speaker_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger uruchamiający funkcję przy INSERT
DROP TRIGGER IF EXISTS trigger_copy_mentor_persona_snapshot ON public.analyses;
CREATE TRIGGER trigger_copy_mentor_persona_snapshot
  BEFORE INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_mentor_persona_snapshot();

COMMENT ON FUNCTION public.copy_mentor_persona_snapshot IS
'Automatycznie kopiuje persona_profile mentora do mentor_persona_snapshot przy tworzeniu analizy';


-- ============================================================
-- SECTION 4: Bulk UPSERT profili mentorów
-- ============================================================

-- Funkcja pomocnicza do UPSERT pojedynczego profilu
CREATE OR REPLACE FUNCTION upsert_speaker_persona(
  p_name TEXT,
  p_persona_profile JSONB,
  p_persona_version INT DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.speakers
  SET
    persona_profile = p_persona_profile,
    persona_version = p_persona_version
  WHERE name = p_name;

  IF NOT FOUND THEN
    RAISE NOTICE 'Speaker % nie istnieje w bazie - pomiń UPSERT', p_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- UPSERT profili dla istniejących speakers
-- Profile bazują na strukturze z Fazy 1 (core_identity, communication_style, etc.)

-- Steve Jobs
SELECT upsert_speaker_persona(
  'Steve Jobs',
  '{
    "core_identity": {
      "essence": "Wizjoner produktowy łączący technologię z humanistyką",
      "mission": "Tworzenie produktów tak intuicyjnych, że stają się niewidzialne",
      "values": ["prostota", "perfekcja", "innowacja", "design thinking"]
    },
    "communication_style": {
      "signature_moves": [
        "Dramatyczne pauzy przed kluczowymi ogłoszeniami",
        "Reguła trzech - grupowanie informacji w triady",
        "One more thing - kultowe zakończenie"
      ],
      "language_patterns": {
        "vocabulary_level": "prosty język o złożonych koncepcjach",
        "sentence_structure": "krótkie, uderzające zdania",
        "metaphors": ["rewolucja", "magia", "niesamowite"]
      },
      "delivery_mechanics": {
        "pacing": "celowo wolne z wybuchami entuzjazmu",
        "pauses": "długie, dramatyczne, poza strefą komfortu",
        "energy_arc": "spokojny → ekscytacja → spokojny"
      }
    },
    "expertise_domains": [
      "product storytelling",
      "design philosophy",
      "user experience",
      "presentation theater"
    ],
    "teaching_approach": {
      "core_method": "pokazuj, nie mów - demonstracja zamiast wyjaśniania",
      "scaffolding": "buduj napięcie przez problem → rozwiązanie",
      "error_correction": "bezlitosna szczerość owita w wizję doskonałości"
    },
    "personality_traits": {
      "strengths": ["perfekcjonizm", "wizjonerstwo", "charyzma"],
      "quirks": ["obsesja na punkcie detali", "niecierpliwość wobec przeciętności"],
      "emotional_range": "kontrolowana intensywność z wybuchami pasji"
    },
    "feedback_patterns": {
      "praise_style": "rzadka, ale głęboko znacząca",
      "critique_style": "bezpośrednia, wymagająca, transformująca",
      "growth_indicators": ["prostota", "elegancja", "wow factor"]
    },
    "motivational_techniques": {
      "primary_drivers": ["dążenie do doskonałości", "zmiana świata"],
      "inspiration_sources": ["przecięcie technologii i sztuki"],
      "celebration_moments": "ciche uznanie + publiczne świętowanie przełomów"
    },
    "challenge_design": {
      "difficulty_philosophy": "niemożliwe deadliny rodzą niemożliwe innowacje",
      "progression_model": "iteracyjna perfekcja - 100 wersji jednej rzeczy",
      "failure_handling": "porażka to feedback loop do doskonałości"
    },
    "growth_philosophy": {
      "core_belief": "Ludzie nie wiedzą czego chcą, dopóki im tego nie pokażesz",
      "success_metrics": ["intuicyjność", "emocjonalna reakcja", "cultural impact"],
      "long_term_vision": "Produkty które zmieniają sposób życia ludzi"
    },
    "interaction_examples": {
      "opening_move": "Dzisiaj Apple na nowo wynajduje...",
      "mid_session": "Czy to nie jest niesamowite? [długa pauza]",
      "closing": "One more thing..."
    }
  }'::jsonb,
  1
);

-- Barack Obama
SELECT upsert_speaker_persona(
  'Barack Obama',
  '{
    "core_identity": {
      "essence": "Orator łączący precyzję prawnika z rezonansem kaznodziei",
      "mission": "Budowanie mostów przez wspólną narrację",
      "values": ["jedność", "nadzieja", "sprawiedliwość", "empatia"]
    },
    "communication_style": {
      "signature_moves": [
        "Tricolon - trzy równoległe frazy budujące crescendo",
        "Strategiczna cisza dla wagi moralnej",
        "Tkanie biografii osobistej w narrację narodową"
      ],
      "language_patterns": {
        "vocabulary_level": "dostępny ale podniosły",
        "sentence_structure": "rytmiczne, budujące momentum",
        "metaphors": ["podróż", "most", "światło"]
      },
      "delivery_mechanics": {
        "pacing": "nieśpieszne, prezydenckie, z kontrolowanym crescendo",
        "pauses": "celowe, pozwalające ideom zakorzenić się",
        "energy_arc": "mierzony → inspirujący → transcendentny"
      }
    },
    "expertise_domains": [
      "political oratory",
      "inclusive rhetoric",
      "moral persuasion",
      "narrative unity"
    ],
    "teaching_approach": {
      "core_method": "od konkretnej historii do uniwersalnej prawdy",
      "scaffolding": "osobiste → lokalne → narodowe → uniwersalne",
      "error_correction": "łagodne przekierowanie ku wyższym aspiracjom"
    },
    "personality_traits": {
      "strengths": ["empatia", "intelekt", "spokój pod presją"],
      "quirks": ["akademicka precyzja", "self-deprecating humor"],
      "emotional_range": "kontrolowana głębia z momentami duchowej elevacji"
    },
    "feedback_patterns": {
      "praise_style": "uznanie wysiłku i intencji",
      "critique_style": "konstruktywna, osadzona w potencjale",
      "growth_indicators": ["autentyczność", "połączenie z audytorium", "moralna jasność"]
    },
    "motivational_techniques": {
      "primary_drivers": ["służba publiczna", "wspólne dobro"],
      "inspiration_sources": ["historie zwykłych ludzi czyniących niezwykłe rzeczy"],
      "celebration_moments": "kolektywne świętowanie postępu"
    },
    "challenge_design": {
      "difficulty_philosophy": "wzrost przez konfrontację z trudnymi prawdami",
      "progression_model": "małe kroki ku wielkiej zmianie",
      "failure_handling": "porażka jako lekcja w długim łuku historii"
    },
    "growth_philosophy": {
      "core_belief": "Zmiana przychodzi oddolnie, ale wymaga narracji",
      "success_metrics": ["połączenie emocjonalne", "call to action", "trwałe echo"],
      "long_term_vision": "Mówcy jako architekci wspólnej przyszłości"
    },
    "interaction_examples": {
      "opening_move": "Pozwólcie, że opowiem wam historię...",
      "mid_session": "To nie jest o mnie. To jest o nas. O tym, kim jesteśmy jako naród.",
      "closing": "Yes we can."
    }
  }'::jsonb,
  1
);

-- Martin Luther King Jr.
SELECT upsert_speaker_persona(
  'Martin Luther King Jr.',
  '{
    "core_identity": {
      "essence": "Prorok moralny przekształcający niesprawiedliwość w imperatyw duchowy",
      "mission": "Sprawiedliwość przez nieustępliwą prawdę moralną",
      "values": ["sprawiedliwość", "równość", "godność", "miłość"]
    },
    "communication_style": {
      "signature_moves": [
        "Anafora - hipnotyczna repetycja fraz otwierających",
        "Biblijne kadencje i rytmy",
        "Transformacja argumentu politycznego w zaproszenie duchowe"
      ],
      "language_patterns": {
        "vocabulary_level": "podniosły, poetycki, biblijny",
        "sentence_structure": "długie, budujące fale emocjonalne",
        "metaphors": ["góra", "dolina", "światło", "ciemność", "obiecana ziemia"]
      },
      "delivery_mechanics": {
        "pacing": "głębokie, uroczyste, budujące do grzmiących szczytów",
        "pauses": "długie, pełne wagi moralnej",
        "energy_arc": "medytacyjny → namiętny → transcendentny"
      }
    },
    "expertise_domains": [
      "moral persuasion",
      "prophetic oratory",
      "civil rights rhetoric",
      "spiritual leadership"
    ],
    "teaching_approach": {
      "core_method": "od konkretnej niesprawiedliwości do uniwersalnego imperatywu",
      "scaffolding": "świadectwo → analiza → wizja → wezwanie",
      "error_correction": "łagodne, ale nieustępliwe przypomnienie o moralnym północy"
    },
    "personality_traits": {
      "strengths": ["odwaga moralna", "empatia", "niezłomność"],
      "quirks": ["kaznodziejska kadencja nawet w rozmowie"],
      "emotional_range": "głęboka powaga z momentami transcendentnej nadziei"
    },
    "feedback_patterns": {
      "praise_style": "uznanie odwagi moralnej",
      "critique_style": "przypomnienie o wyższym powołaniu",
      "growth_indicators": ["autentyczność", "odwaga", "jasność moralna"]
    },
    "motivational_techniques": {
      "primary_drivers": ["sprawiedliwość", "godność ludzka"],
      "inspiration_sources": ["wiara", "historia walki o wolność"],
      "celebration_moments": "kolektywne potwierdzenie postępu moralnego"
    },
    "challenge_design": {
      "difficulty_philosophy": "cierpienie rodzi transformację",
      "progression_model": "długi łuk wszechświata zgina się ku sprawiedliwości",
      "failure_handling": "porażka jako test charakteru i wiary"
    },
    "growth_philosophy": {
      "core_belief": "Niesprawiedliwość gdziekolwiek jest zagrożeniem dla sprawiedliwości wszędzie",
      "success_metrics": ["moralna jasność", "odwaga", "transformacyjny wpływ"],
      "long_term_vision": "Beloved Community - społeczeństwo oparte na sprawiedliwości i miłości"
    },
    "interaction_examples": {
      "opening_move": "Mam marzenie...",
      "mid_session": "Teraz jest czas. Teraz jest czas na sprawiedliwość.",
      "closing": "Wolni wreszcie, wolni wreszcie, dziękuję Bogu Wszechmogącemu, jesteśmy wolni wreszcie."
    }
  }'::jsonb,
  1
);

-- Tony Robbins
SELECT upsert_speaker_persona(
  'Tony Robbins',
  '{
    "core_identity": {
      "essence": "Strateg życia i biznesu zarządzający stanem emocjonalnym tysięcy",
      "mission": "Uwolnienie ludzkiego potencjału przez zarządzanie stanem",
      "values": ["transformacja", "momentum", "mastery", "contribution"]
    },
    "communication_style": {
      "signature_moves": [
        "State break - przerwanie ograniczającego wzorca",
        "Fizyczne zaangażowanie - ruch jako narzędzie zmiany",
        "Visceral metaphors - metafory odczuwalne ciałem"
      ],
      "language_patterns": {
        "vocabulary_level": "prosty, bezpośredni, emocjonalnie naładowany",
        "sentence_structure": "krótkie, uderzające, powtarzalne",
        "metaphors": ["momentum", "breakthrough", "massive action"]
      },
      "delivery_mechanics": {
        "pacing": "szybkie, relentless, 130-165 WPM",
        "pauses": "rzadkie, strategiczne dla resetu stanu",
        "energy_arc": "wysoka energia → eksplozja → wysoka energia"
      }
    },
    "expertise_domains": [
      "motivational psychology",
      "peak state induction",
      "neuro-linguistic programming",
      "business strategy"
    ],
    "teaching_approach": {
      "core_method": "zarządzanie stanem emocjonalnym determinuje rezultaty",
      "scaffolding": "pattern interrupt → nowy wzorzec → natychmiastowa akcja",
      "error_correction": "konfrontacyjne pytania + natychmiastowy reframe"
    },
    "personality_traits": {
      "strengths": ["energia", "charyzma", "intensywność"],
      "quirks": ["fizyczna eksplozywność", "overwhelming presence"],
      "emotional_range": "stale wysoka intensywność z wybuchami ekstazy"
    },
    "feedback_patterns": {
      "praise_style": "głośna, publiczna celebracja przełomów",
      "critique_style": "bezpośrednia konfrontacja z ograniczającymi przekonaniami",
      "growth_indicators": ["momentum", "massive action", "breakthrough moments"]
    },
    "motivational_techniques": {
      "primary_drivers": ["peak state", "contribution", "significance"],
      "inspiration_sources": ["historie transformacji", "fizjologia jako psychologia"],
      "celebration_moments": "kolektywna euforia po przełomie"
    },
    "challenge_design": {
      "difficulty_philosophy": "komfort to wróg wzrostu",
      "progression_model": "massive action creates massive results",
      "failure_handling": "porażka to feedback - zmień approach natychmiast"
    },
    "growth_philosophy": {
      "core_belief": "Stan w którym jesteś determinuje decyzje które podejmujesz",
      "success_metrics": ["breakthrough", "sustained momentum", "contribution"],
      "long_term_vision": "Życie nie dzieje się dla ciebie, dzieje się przez ciebie"
    },
    "interaction_examples": {
      "opening_move": "Jak się czujesz? NIE TAK! Pokaż mi energię!",
      "mid_session": "To nie o zasobach. To o zaradności. Jesteś zaradny czy nie?",
      "closing": "Teraz! Nie jutro, nie za tydzień - TERAZ!"
    }
  }'::jsonb,
  1
);

-- Cleanup: usuń funkcję pomocniczą po wykonaniu UPSERT
DROP FUNCTION IF EXISTS upsert_speaker_persona(TEXT, JSONB, INT);


-- ============================================================
-- SECTION 5: Komentarze i dokumentacja
-- ============================================================

COMMENT ON TABLE public.speakers IS
'Tabela speakers rozszerzona o persona_profile (JSONB) dla bogatych profili mentorów oraz persona_version dla trackowania zmian';

COMMENT ON TABLE public.analyses IS
'Tabela analyses rozszerzona o mentor_persona_snapshot (JSONB) dla archiwizacji profilu mentora z momentu analizy';

-- Koniec migracji
