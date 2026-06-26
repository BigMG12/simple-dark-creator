/**
 * Buduje prompt analizy specyficzny dla wybranego mentora.
 * Używa 12-warstwowego DNA mentora (v2_brutal_polish)
 */

interface MentorPersonaV2 {
  version: string;
  last_updated: string;
  LAYER_1_identity: {
    name: string;
    archetype: string;
    one_line_mantra: string;
    what_makes_unique: string;
  };
  LAYER_2_somatic_signature: {
    speaking_pace_wpm: [number, number];
    comment_pace: string;
    energy_level: string;
    energy_pattern: string;
    tone_default: string;
    comment_tone: string;
    pause_pattern: string;
    voice_register: string;
    physical_intensity: string;
  };
  LAYER_3_linguistic_DNA: {
    signature_openings: string[];
    signature_closings: string[];
    verbal_tics: string[];
    vocabulary_level: string;
    comment_vocabulary: string;
  };
  LAYER_4_psychological_drivers: {
    what_drives_him: string;
    what_he_hates: string[];
    what_he_will_never_back_down_from: string;
    respects: string;
    despises: string;
  };
  LAYER_5_signature_moves: Array<{
    name: string;
    description: string;
    when_uses: string;
    polish_phrase: string;
    example_drill?: string;
  }>;
  LAYER_6_under_pressure: {
    if_adept_disagrees: string;
    if_adept_cries: string;
    if_adept_is_great: string;
    if_adept_failed_completely: string;
    if_adept_makes_excuses: string;
    if_adept_asks_for_easier_version: string;
  };
  LAYER_7_feedback_DNA: {
    stage_1_noticing: string;
    stage_2_diagnosis: string;
    stage_3_prescription: string;
    stage_4_push: string;
    uses_metaphors: boolean;
    metaphor_domain: string;
    examples_metaphors?: string[];
  };
  LAYER_11_red_flags_and_calibration: {
    things_belfort_would_NEVER_say?: string[];
    things_voss_would_NEVER_say?: string[];
    things_hormozi_would_NEVER_say?: string[];
    things_robbins_would_NEVER_say?: string[];
    things_goggins_would_NEVER_say?: string[];
    things_jobs_would_NEVER_say?: string[];
    things_obama_would_NEVER_say?: string[];
    things_sinek_would_NEVER_say?: string[];
    things_peterson_would_NEVER_say?: string[];
    things_tate_would_NEVER_say?: string[];
    phrases_completely_alien_to_belfort?: string[];
    phrases_completely_alien_to_voss?: string[];
    phrases_completely_alien_to_hormozi?: string[];
    phrases_completely_alien_to_robbins?: string[];
    phrases_completely_alien_to_goggins?: string[];
    phrases_completely_alien_to_jobs?: string[];
    phrases_completely_alien_to_obama?: string[];
    phrases_completely_alien_to_sinek?: string[];
    phrases_completely_alien_to_peterson?: string[];
    phrases_completely_alien_to_tate?: string[];
  };
  LAYER_12_polish_adaptations: {
    voice_in_polish: string;
    signature_phrases_polish: Array<{
      english: string;
      polish: string;
      comment: string;
    }>;
    feedback_structure_polish: string;
  };
}

interface Speaker {
  id: string;
  name: string;
  persona_profile: MentorPersonaV2;
  persona_version: number;
}

interface UserMetrics {
  pace_wpm: number;
  fillers_count: number;
  filler_list: string[];
  energy_variance: number;
  pause_count: number;
  clarity_score: number;
  vocabulary_unique_words: number;
  duration_seconds: number;
}

interface MentorAnalysisPromptParams {
  mentor: Speaker;
  transcript: string;
  topic: string;
  userMetrics: UserMetrics;
  userCategory?: string;
}

/**
 * Buduje pełny prompt analizy w głosie mentora używając 12-warstwowego DNA
 */
export function buildMentorAnalysisPrompt({
  mentor,
  transcript,
  topic,
  userMetrics,
  userCategory = 'general',
}: MentorAnalysisPromptParams): string {
  const dna = mentor.persona_profile;

  // Walidacja wersji
  if (!dna.version || dna.version !== 'v2_brutal_polish') {
    throw new Error(`Mentor ${mentor.name} nie ma profilu v2_brutal_polish. Obecna wersja: ${dna.version || 'brak'}`);
  }

  // Extract red flags - dynamicznie na podstawie nazwy mentora
  const mentorKey = mentor.name.toLowerCase().replace(/\s+/g, '_');
  const neverSayKey = `things_${mentorKey}_would_NEVER_say` as keyof typeof dna.LAYER_11_red_flags_and_calibration;
  const alienPhrasesKey = `phrases_completely_alien_to_${mentorKey}` as keyof typeof dna.LAYER_11_red_flags_and_calibration;

  const neverSay = (dna.LAYER_11_red_flags_and_calibration[neverSayKey] as string[]) || [];
  const alienPhrases = (dna.LAYER_11_red_flags_and_calibration[alienPhrasesKey] as string[]) || [];

  // Target WPM dla kategorii
  const targetWpmMap: Record<string, [number, number]> = {
    sales: [140, 180],
    motivation: [120, 160],
    leadership: [100, 130],
    storytelling: [90, 120],
    authority: [110, 140],
    influence: [90, 120],
    general: [110, 140],
  };
  const targetWpm = targetWpmMap[userCategory] || targetWpmMap.general;

  return `Jesteś ${dna.LAYER_1_identity.name}.

═══════════════════════════════════════════════════════════════
TWOJE DNA (12 WARSTW)
═══════════════════════════════════════════════════════════════

LAYER 1 — TOŻSAMOŚĆ:
Archetyp: ${dna.LAYER_1_identity.archetype}
Mantra: "${dna.LAYER_1_identity.one_line_mantra}"
Co cię wyróżnia: ${dna.LAYER_1_identity.what_makes_unique}

LAYER 2 — SOMATYKA:
Tempo mówienia: ${dna.LAYER_2_somatic_signature.speaking_pace_wpm[0]}-${dna.LAYER_2_somatic_signature.speaking_pace_wpm[1]} WPM
${dna.LAYER_2_somatic_signature.comment_pace}
Energia: ${dna.LAYER_2_somatic_signature.energy_level} (${dna.LAYER_2_somatic_signature.energy_pattern})
Ton: ${dna.LAYER_2_somatic_signature.tone_default}
${dna.LAYER_2_somatic_signature.comment_tone}
Pauzy: ${dna.LAYER_2_somatic_signature.pause_pattern}

LAYER 3 — JĘZYK:
Signature openings: ${dna.LAYER_3_linguistic_DNA.signature_openings.slice(0, 3).join(' / ')}
Signature closings: ${dna.LAYER_3_linguistic_DNA.signature_closings.slice(0, 3).join(' / ')}
Verbal tics: ${dna.LAYER_3_linguistic_DNA.verbal_tics.slice(0, 5).join(', ')}
Poziom słownictwa: ${dna.LAYER_3_linguistic_DNA.vocabulary_level}

LAYER 4 — PSYCHOLOGIA:
Co cię napędza: ${dna.LAYER_4_psychological_drivers.what_drives_him}
Czego nienawidzisz: ${dna.LAYER_4_psychological_drivers.what_he_hates.slice(0, 3).join('; ')}
Szanujesz: ${dna.LAYER_4_psychological_drivers.respects}

LAYER 5 — SIGNATURE MOVES (top 3):
${dna.LAYER_5_signature_moves.slice(0, 3).map((move, i) =>
  `${i + 1}. ${move.name}: ${move.description.substring(0, 150)}...`
).join('\n')}

LAYER 6 — POD PRESJĄ:
Gdy adept się nie zgadza: ${dna.LAYER_6_under_pressure.if_adept_disagrees}
Gdy adept zawiódł: ${dna.LAYER_6_under_pressure.if_adept_failed_completely}

LAYER 7 — FEEDBACK DNA (4 ETAPY):
1. ZAUWAŻENIE: ${dna.LAYER_7_feedback_DNA.stage_1_noticing}
2. DIAGNOZA: ${dna.LAYER_7_feedback_DNA.stage_2_diagnosis}
3. RECEPTA: ${dna.LAYER_7_feedback_DNA.stage_3_prescription}
4. PUSH: ${dna.LAYER_7_feedback_DNA.stage_4_push}

Używasz metafor z: ${dna.LAYER_7_feedback_DNA.metaphor_domain}

LAYER 11 — RED FLAGS (CO NIGDY NIE POWIESZ):
${neverSay.slice(0, 5).map(phrase => `- "${phrase}"`).join('\n')}

Frazy całkowicie obce: ${alienPhrases.slice(0, 3).join(', ')}

LAYER 12 — POLSKA ADAPTACJA:
${dna.LAYER_12_polish_adaptations.voice_in_polish}

Signature phrases (PL):
${dna.LAYER_12_polish_adaptations.signature_phrases_polish.slice(0, 3).map(p =>
  `- "${p.polish}" (${p.comment})`
).join('\n')}

STRUKTURA FEEDBACKU:
${dna.LAYER_12_polish_adaptations.feedback_structure_polish}

═══════════════════════════════════════════════════════════════
DANE Z SESJI USERA
═══════════════════════════════════════════════════════════════

Temat: ${topic}
Czas trwania: ${userMetrics.duration_seconds}s
Kategoria: ${userCategory}

METRYKI (RZECZYWISTE LICZBY Z SESJI):
- Pace: ${userMetrics.pace_wpm.toFixed(1)} WPM (cel dla ${userCategory}: ${targetWpm[0]}-${targetWpm[1]} WPM)
- Filler words: ${userMetrics.fillers_count} (nazwane: ${userMetrics.filler_list.join(', ')})
- Wariancja energii: ${userMetrics.energy_variance.toFixed(2)}
- Liczba pauz: ${userMetrics.pause_count}
- Klarowność: ${userMetrics.clarity_score}/100
- Słownictwo unique: ${userMetrics.vocabulary_unique_words} słów
- Czas: ${userMetrics.duration_seconds}s

TRANSKRYPT:
"""
${transcript}
"""

═══════════════════════════════════════════════════════════════
TWOJE ZADANIE
═══════════════════════════════════════════════════════════════

KRYTYCZNE ZASADY:

1. Mów PO POLSKU używając LAYER_12.signature_phrases_polish i LAYER_12.polish_idioms
2. Zachowuj LAYER_2 (somatic_signature) — twoje tempo i energia
3. Wzorzec feedbacku z LAYER_7 (4 etapy):
   - Najpierw NAZWIJ konkretny moment (z metrykami sesji)
   - DIAGNOZA dlaczego to było źle
   - RECEPTA — konkretne alternatywne słowa/działanie
   - PUSH — agresywne wezwanie do działania

4. NIGDY nie używaj fraz z LAYER_11 (red flags)
5. Brutalne, konkretne. Nie 'może', nie 'spróbuj', nie 'było ok'.
   Tylko: 'Tak. Nie. Tu. Zrób TO.'
6. Feedback MUSI bazować na RZECZYWISTYCH METRYKACH z sesji
7. Cytuj KONKRETNE fragmenty transkryptu (nie ogólniki)

WYGENERUJ JSON (tylko JSON, zero markdown, zero komentarzy):

{
  "verdict_score_0_100": <number 0-100>,
  "verdict_label": <"Surowy" | "Solidny" | "Mocny" | "Mistrzowski">,
  "mentor_quote_responsive_to_session": "<Twój brutalny cytat 2-3 zdania bazujący na METRYKACH usera, w stylu LAYER_7. NIE generic motywacja. Konkretnie do TEGO nagrania. Użyj swoich signature phrases z LAYER_12.>",
  "what_was_concrete_problem": {
    "moment": "<sekunda X nagrania, fragment transkryptu '...'> ",
    "diagnosis": "<Dlaczego to było źle, używając LAYER_8 cultural references jeśli pasuje>",
    "what_client_thought": "<Co odbiorca pomyślał w tym momencie>"
  },
  "concrete_prescription": {
    "instead_of": "<twój fragment X z transkryptu>",
    "say_this": "<konkretna alternatywa słowo po słowie W STYLU MENTORA, używając LAYER_12 polish phrases>",
    "why_this_works": "<Mechanizm psychologiczny / sales / whatever fits domain>"
  },
  "push_to_action": "<Agresywne wezwanie do nagrania znowu, w stylu LAYER_6.if_adept_failed_completely (jeśli słabo) lub LAYER_6.if_adept_is_great (jeśli dobrze). Użyj LAYER_12 signature phrases.>",
  "next_drill_recommendation": {
    "drill_name": "<Nazwa ćwiczenia w twoim stylu>",
    "why_this_drill": "<Bo Twoja największa słabość to X a ten drill atakuje X. Konkretnie, brutalnie.>",
    "how_to_do_it": "<Konkretna instrukcja, krok po kroku>"
  }
}

PAMIĘTAJ:
- Feedback MUSI odnosić się do konkretnych metryk (pace, fillers, pauzy)
- Cytuj KONKRETNE fragmenty transkryptu
- Używaj SWOICH signature phrases z LAYER_12
- Zachowaj SWÓJ ton z LAYER_2
- Nie używaj fraz z LAYER_11 (red flags)
- Brutalna szczerość, zero miłych ogólników`;
}

/**
 * Interfejs odpowiedzi od GPT z analizą mentora (v2)
 */
export interface MentorAnalysisResponseV2 {
  verdict_score_0_100: number;
  verdict_label: 'Surowy' | 'Solidny' | 'Mocny' | 'Mistrzowski';
  mentor_quote_responsive_to_session: string;
  what_was_concrete_problem: {
    moment: string;
    diagnosis: string;
    what_client_thought: string;
  };
  concrete_prescription: {
    instead_of: string;
    say_this: string;
    why_this_works: string;
  };
  push_to_action: string;
  next_drill_recommendation: {
    drill_name: string;
    why_this_drill: string;
    how_to_do_it: string;
  };
}

export function isV2PersonaProfile(personaProfile: unknown): boolean {
  if (!personaProfile || typeof personaProfile !== "object") return false;
  const p = personaProfile as Record<string, unknown>;
  const hasObject = (key: string) => !!p[key] && typeof p[key] === "object";
  const l12 = p.LAYER_12_polish_adaptations as Record<string, unknown> | undefined;

  return hasObject("LAYER_1_identity")
    && hasObject("LAYER_2_somatic_signature")
    && hasObject("LAYER_3_linguistic_DNA")
    && hasObject("LAYER_4_psychological_drivers")
    && Array.isArray(p.LAYER_5_signature_moves)
    && hasObject("LAYER_6_under_pressure")
    && hasObject("LAYER_7_feedback_DNA")
    && hasObject("LAYER_11_red_flags_and_calibration")
    && hasObject("LAYER_12_polish_adaptations")
    && Array.isArray(l12?.signature_phrases_polish);
}

export function describeV2PersonaProfile(personaProfile: unknown): string {
  if (!personaProfile || typeof personaProfile !== "object") return "missing";
  const p = personaProfile as Record<string, unknown>;
  const keys = Object.keys(p);
  return `keys=[${keys.join(", ")}] version=${String(p.version ?? "brak")}`;
}
