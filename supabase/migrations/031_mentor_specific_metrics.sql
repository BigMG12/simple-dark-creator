-- ============================================================
-- BIG SPEAKING — Mentor-Specific Metrics System
-- Migration: 020_mentor_specific_metrics.sql
--
-- FAZA 4: CATEGORY-SPECIFIC METRIC OVERRIDES
-- Każdy mentor ma swoje dodatkowe metryki, na które patrzy pierwszorzędnie.
-- Rozszerza schema persona_profile o nowe pole primary_metrics_this_mentor_cares_about.
-- ============================================================


-- ============================================================
-- 1. EXTEND: speaker_categories
-- Dodaj pole primary_metrics_this_mentor_cares_about
-- ============================================================

ALTER TABLE public.speaker_categories
  ADD COLUMN IF NOT EXISTS primary_metrics_this_mentor_cares_about JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.speaker_categories.primary_metrics_this_mentor_cares_about IS
'Array of custom metrics specific to this mentor category. Each metric defines:
- metric_name: internal identifier
- display_name: user-facing label
- description: what this metric measures
- how_to_score: instructions for computation
- ideal_range: [min, max] target values
- weight: importance factor (0-1)';


-- ============================================================
-- 2. EXTEND: analyses
-- Dodaj kolumnę mentor_specific_metrics dla przechowywania wyników
-- ============================================================

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS mentor_specific_metrics JSONB;

COMMENT ON COLUMN public.analyses.mentor_specific_metrics IS
'Computed values for mentor-specific metrics. Structure:
{
  "urgency_density": 4.2,
  "close_attempts": 2,
  "tonality_shifts": 8,
  ...
}';


-- ============================================================
-- 3. UPDATE: speaker_categories with primary metrics
-- Definiuj 3-5 custom metryk dla każdej kategorii
-- ============================================================

-- MOTIVATION (Goggins, Tony Robbins, Les Brown, Eric Thomas, Mel Robbins)
UPDATE public.speaker_categories
SET primary_metrics_this_mentor_cares_about = '[
  {
    "metric_name": "personal_stakes_stated",
    "display_name": "Personal Stakes",
    "description": "Ile razy użytkownik ujawnił osobiste konsekwencje lub stawkę",
    "how_to_score": "Zlicz użycie fraz: I will, I must, my life depends, everything is on the line, this is my moment. Dla 60s powinno być 1-3.",
    "ideal_range": [1, 4],
    "weight": 0.30
  },
  {
    "metric_name": "intensity_peaks",
    "display_name": "Intensity Peaks",
    "description": "Liczba momentów maksymalnej intensywności emocjonalnej",
    "how_to_score": "Zidentyfikuj momenty z wykrzyknikami, powtórzeniami, wzmocnieniami (very, extremely, absolutely). Minimum 2-3 na minutę.",
    "ideal_range": [2, 5],
    "weight": 0.25
  },
  {
    "metric_name": "confrontation_language",
    "display_name": "Confrontation Language",
    "description": "Bezpośrednie wyzwania rzucone słuchaczowi",
    "how_to_score": "Zlicz pytania retoryczne i oskarżenia: are you, why dont you, what are you waiting for, stop, quit. Cel: 3-6/min.",
    "ideal_range": [3, 6],
    "weight": 0.25
  },
  {
    "metric_name": "permission_statements",
    "display_name": "Permission Statements",
    "description": "Momenty dawania pozwolenia na chcenie więcej",
    "how_to_score": "Zlicz: you can, you deserve, its okay to, you are allowed to, give yourself permission. Minimum 1-2 na 60s.",
    "ideal_range": [1, 3],
    "weight": 0.20
  }
]'::jsonb
WHERE name = 'motivation';

-- SALES (Belfort, Grant Cardone, Brian Tracy, Zig Ziglar, Johnny Miller)
UPDATE public.speaker_categories
SET primary_metrics_this_mentor_cares_about = '[
  {
    "metric_name": "urgency_density",
    "display_name": "Urgency Density",
    "description": "Ile razy na minutę użytkownik stworzył poczucie pilności/straty/okazji",
    "how_to_score": "Zlicz użycie słów: now, today, limited, only, last chance, before, running out, dont wait, act fast. Docelowo 3-6/min.",
    "ideal_range": [3, 6],
    "weight": 0.35
  },
  {
    "metric_name": "close_attempts",
    "display_name": "Close Attempts",
    "description": "Ile razy użytkownik zapytał wprost/poprosił o decyzję",
    "how_to_score": "Zidentyfikuj zdania typu: are you ready, lets do it, say yes, sign today, make the decision, commit now. Dla 60s powinno być 1-2.",
    "ideal_range": [1, 3],
    "weight": 0.25
  },
  {
    "metric_name": "tonality_shifts",
    "display_name": "Tonality Shifts",
    "description": "Zmiany tonalności dla podkreślenia pewności",
    "how_to_score": "Zlicz momenty z wyraźną zmianą tempa/głośności/pewności. Wymaga analizy AI kontekstu. Cel: 5-10/min.",
    "ideal_range": [5, 10],
    "weight": 0.20
  },
  {
    "metric_name": "objection_preemption",
    "display_name": "Objection Pre-emption",
    "description": "Proaktywne neutralizowanie obiekcji przed ich pojawieniem",
    "how_to_score": "Zlicz: you might think, some people say, I know what youre thinking, before you ask, let me address. Minimum 1-2 na 60s.",
    "ideal_range": [1, 3],
    "weight": 0.20
  }
]'::jsonb
WHERE name = 'sales';

-- INFLUENCE (Andrew Tate, Chris Voss, Robert Cialdini, Patrick Bet-David, Alex Hormozi)
UPDATE public.speaker_categories
SET primary_metrics_this_mentor_cares_about = '[
  {
    "metric_name": "authority_signals",
    "display_name": "Authority Signals",
    "description": "Sygnały budowania wiarygodności przez credentials/wyniki",
    "how_to_score": "Zlicz: I have, my experience, when I, the data shows, research proves, experts agree. Cel: 2-4/min.",
    "ideal_range": [2, 4],
    "weight": 0.30
  },
  {
    "metric_name": "social_proof_usage",
    "display_name": "Social Proof",
    "description": "Odwołania do zachowań innych jako walidacja",
    "how_to_score": "Zlicz: others have, most people, everyone is, thousands of, clients report. Minimum 1-2 na 60s.",
    "ideal_range": [1, 3],
    "weight": 0.25
  },
  {
    "metric_name": "framework_density",
    "display_name": "Framework Density",
    "description": "Użycie numerowanych systemów i struktur",
    "how_to_score": "Zlicz: three steps, five principles, the framework, first/second/third, number one. Cel: 2-5/min.",
    "ideal_range": [2, 5],
    "weight": 0.25
  },
  {
    "metric_name": "value_equation_framing",
    "display_name": "Value Equation",
    "description": "Matematyczne/logiczne framowanie wartości",
    "how_to_score": "Zlicz: if X then Y, the math is simple, calculate, ROI, cost versus benefit, compare. Minimum 1-2 na 60s.",
    "ideal_range": [1, 3],
    "weight": 0.20
  }
]'::jsonb
WHERE name = 'influence';

-- LEADERSHIP (Obama, MLK, Steve Jobs, Simon Sinek, Jocko Willink, Nelson Mandela)
UPDATE public.speaker_categories
SET primary_metrics_this_mentor_cares_about = '[
  {
    "metric_name": "gravitas_pauses_per_min",
    "display_name": "Gravitas Pauses",
    "description": "Dramatyczne pauzy sygnalizujące wagę",
    "how_to_score": "Zlicz pauzy >1.5s przed kluczowymi słowami. Wymaga analizy timestampów. Cel: 2-4/min.",
    "ideal_range": [2, 4],
    "weight": 0.30
  },
  {
    "metric_name": "we_language_frequency",
    "display_name": "We Language",
    "description": "Użycie języka inkluzywnego budującego wspólną tożsamość",
    "how_to_score": "Zlicz: we, our, us, together, collective, shared. Powinno stanowić 15-25% wszystkich zaimków.",
    "ideal_range": [15, 25],
    "weight": 0.25
  },
  {
    "metric_name": "vision_statement_density",
    "display_name": "Vision Statements",
    "description": "Konkretne opisy przyszłego stanu",
    "how_to_score": "Zlicz: imagine, picture, future where, we will, one day, when we. Minimum 1-2 na 60s.",
    "ideal_range": [1, 3],
    "weight": 0.25
  },
  {
    "metric_name": "accountability_language",
    "display_name": "Accountability Language",
    "description": "Przyjmowanie osobistej odpowiedzialności",
    "how_to_score": "Zlicz: I take responsibility, my fault, I own this, on me, I failed. Cel: 1-2 na 60s.",
    "ideal_range": [1, 2],
    "weight": 0.20
  }
]'::jsonb
WHERE name = 'leadership';

-- STORYTELLING (McConaughey, Donald Miller, Brené Brown, Will Smith, Trevor Noah)
UPDATE public.speaker_categories
SET primary_metrics_this_mentor_cares_about = '[
  {
    "metric_name": "sensory_language_density",
    "display_name": "Sensory Details",
    "description": "Gęstość szczegółów sensorycznych (wzrok, dźwięk, dotyk, zapach)",
    "how_to_score": "Zlicz konkretne opisy: kolory, dźwięki, zapachy, tekstury, temperatury. Cel: 5-10/min.",
    "ideal_range": [5, 10],
    "weight": 0.30
  },
  {
    "metric_name": "dialogue_use",
    "display_name": "Dialogue Usage",
    "description": "Użycie bezpośredniego dialogu w narracji",
    "how_to_score": "Zlicz momenty cytowania: he said, she told me, I asked, they replied. Minimum 2-4 na 60s.",
    "ideal_range": [2, 4],
    "weight": 0.25
  },
  {
    "metric_name": "emotional_beats",
    "display_name": "Emotional Beats",
    "description": "Liczba wyraźnych zmian stanu emocjonalnego",
    "how_to_score": "Zidentyfikuj przejścia: radość→smutek, strach→ulga, napięcie→rozwiązanie. Wymaga AI. Cel: 2-4/min.",
    "ideal_range": [2, 4],
    "weight": 0.25
  },
  {
    "metric_name": "narrative_arc_completeness",
    "display_name": "Narrative Arc",
    "description": "Czy historia ma pełną strukturę (setup, conflict, resolution)",
    "how_to_score": "Binarne 0-100: 0 = brak struktury, 50 = częściowa, 100 = pełny łuk. Wymaga AI analysis.",
    "ideal_range": [70, 100],
    "weight": 0.20
  }
]'::jsonb
WHERE name = 'storytelling';

-- AUTHORITY (Jordan Peterson, Gary Vaynerchuk, Joe Rogan, Lex Fridman, Naval Ravikant)
UPDATE public.speaker_categories
SET primary_metrics_this_mentor_cares_about = '[
  {
    "metric_name": "credential_signals",
    "display_name": "Credential Signals",
    "description": "Sygnały ustanawiające prawo do zajmowania stanowiska",
    "how_to_score": "Zlicz: research shows, studies indicate, in my work, documented, peer-reviewed, data proves. Cel: 2-4/min.",
    "ideal_range": [2, 4],
    "weight": 0.30
  },
  {
    "metric_name": "contrarian_claims",
    "display_name": "Contrarian Claims",
    "description": "Stanowiska przeciwne mainstreamowi",
    "how_to_score": "Zlicz: contrary to, most people think, actually, the truth is, unpopular opinion. Minimum 1-2 na 60s.",
    "ideal_range": [1, 3],
    "weight": 0.25
  },
  {
    "metric_name": "intellectual_depth_markers",
    "display_name": "Intellectual Depth",
    "description": "Markery głębokiego zaangażowania z złożonością",
    "how_to_score": "Zlicz: nuanced, complex, depends on, multifaceted, on the other hand, however. Cel: 3-6/min.",
    "ideal_range": [3, 6],
    "weight": 0.25
  },
  {
    "metric_name": "productive_pauses",
    "display_name": "Thinking Pauses",
    "description": "Pauzy sygnalizujące rzeczywiste myślenie w czasie rzeczywistym",
    "how_to_score": "Zlicz pauzy >1s z kontekstem poszukiwania słowa/precyzji. Wymaga AI. Cel: 2-4/min.",
    "ideal_range": [2, 4],
    "weight": 0.20
  }
]'::jsonb
WHERE name = 'authority';


-- ============================================================
-- 4. CREATE INDEX for faster queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_analyses_mentor_specific_metrics
  ON public.analyses USING gin (mentor_specific_metrics);


-- ============================================================
-- END OF MIGRATION
-- ============================================================
