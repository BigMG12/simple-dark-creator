/**
 * Buduje prompt analizy specyficzny dla wybranego mentora.
 * Każdy mentor ma unikalny głos, styl i filozofię coachingu.
 *
 * UWAGA: builder jest DEFENSYWNY — każde pole jest odczytywane przez
 * helpery `s/arr/n`, więc nawet niekompletny `persona_profile` nie powoduje
 * `Cannot read properties of undefined`. Twardą walidację kształtu robi
 * `mentor-analysis.ts` przed wywołaniem buildera.
 *
 * MODULE SENTINEL: P3X8N4-MPB-r11 (size-bump dla cache deploy)
 */
console.log("[mentor-prompt-builder] loaded P3X8N4-MPB-r11");

interface MentorPersona {
  id: string;
  name: string;
  // celowo `any` — builder akceptuje DOWOLNY kształt i sam się broni
  // przed brakami pól. Właściwą walidację robi mentor-analysis.ts.
  // deno-lint-ignore no-explicit-any
  persona_profile: any;
}

interface UserMetrics {
  wpm: number;
  total_filler_count: number;
  filler_density: number;
  pause_count: number;
  avg_pause_duration_ms: number;
  vocab_depth_score: number;
  duration_seconds: number;
}

interface MentorAnalysisPromptParams {
  mentor: MentorPersona;
  transcript: string;
  topic: string;
  userMetrics: UserMetrics;
}

// ---------------------------------------------------------------------------
// Defensive helpers — never throw on missing/odd shapes
// ---------------------------------------------------------------------------

function s(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function arr(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  }
  return [];
}

function n(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function rangeStr(value: unknown, fallback = "—"): string {
  // Może być stringiem ("130-160") lub tablicą [130, 160]
  if (Array.isArray(value) && value.length >= 2) return `${value[0]}-${value[1]}`;
  return s(value, fallback);
}

function joinOrDash(list: string[], sep = ", "): string {
  return list.length > 0 ? list.join(sep) : "—";
}

function bullets(list: string[]): string {
  return list.length > 0 ? list.map((h) => `- ${h}`).join("\n") : "- —";
}

/**
 * Buduje pełny prompt analizy w głosie mentora
 */
export function buildMentorAnalysisPrompt({
  mentor,
  transcript,
  topic,
  userMetrics,
}: MentorAnalysisPromptParams): string {
  const persona = (mentor.persona_profile ?? {}) as Record<string, unknown>;

  const identity = (persona.identity ?? {}) as Record<string, unknown>;
  const voice = (persona.voice_signature ?? {}) as Record<string, unknown>;
  const language = (persona.language_signature ?? {}) as Record<string, unknown>;
  const rhetoric = (persona.rhetorical_patterns ?? {}) as Record<string, unknown>;
  const energy = (persona.energy_profile ?? {}) as Record<string, unknown>;
  const teaching = (persona.teaching_signatures ?? {}) as Record<string, unknown>;

  const wpmTypical = n(voice.wpm_typical, 140);

  const fillerRatePerMin = userMetrics.duration_seconds > 0
    ? (userMetrics.total_filler_count / userMetrics.duration_seconds) * 60
    : 0;

  return `Jesteś ${s(mentor.name, "mentorem")}. Konkretnie: ${s(identity.one_sentence_essence, "jesteś wymagającym, konkretnym coachem mowy")}

TWOJA TOŻSAMOŚĆ:
Archetyp: ${s(identity.archetype)}
Era/kontekst: ${s(identity.era_context)}
Ton publiczny: ${s(identity.public_persona_tone)}

TWÓJ GŁOS (masz coachować użytkownika by naśladował TEN styl):
- Typowe tempo: ${wpmTypical} WPM (zakres ${rangeStr(voice.wpm_range)})
- Twoja filozofia pauz: "${s(voice.pause_philosophy)}"
- Twoje sygnaturowe ruchy głosowe: ${joinOrDash(arr(voice.signature_vocal_moves))}
- Typowy arc energii: "${s(energy.energy_arc_pattern)}"

TWÓJ JĘZYK (Ty tak mówisz, użytkownik powinien się uczyć):
- Ulubione słowa: ${joinOrDash(arr(language.favorite_words))}
- Verbalne tiki: ${joinOrDash(arr(language.verbal_tics))}
- Typowe zdania otwierające: ${joinOrDash(arr(language.sentence_starters_typical))}
- Styl metafor: "${s(language.metaphor_style)}"
- Poziom słownictwa: "${s(language.vocabulary_level)}"
- NIGDY nie robisz: ${joinOrDash(arr(rhetoric.never_does))}

TWOJA RETORYKA:
- Twoje główne urządzenia: ${joinOrDash(arr(rhetoric.primary_devices))}
- Tak otwierasz: ${joinOrDash(arr(rhetoric.opening_patterns))}
- Tak zamykasz: ${joinOrDash(arr(rhetoric.closing_patterns))}

CZEGO NIENAWIDZISZ u mówców:
${bullets(arr(persona.what_they_hate))}

CO CELEBRUJESZ:
${bullets(arr(persona.what_they_celebrate))}

TWÓJ STYL COACHINGU:
${s(teaching.when_giving_feedback_style)}
Gdy coś jest do poprawy, mówisz tak: ${s(teaching.correction_language)}
Gdy coś jest mocne, mówisz tak: ${s(teaching.praise_language)}

---

UŻYTKOWNIK NAGRAŁ:

Temat: ${topic}
Czas trwania: ${userMetrics.duration_seconds}s
Surowe metryki jego mowy:
- WPM: ${userMetrics.wpm.toFixed(1)} (Twoje typowe: ${wpmTypical})
- Filler words: ${userMetrics.total_filler_count} (${fillerRatePerMin.toFixed(1)}/min)
- Pauzy > 400ms: ${userMetrics.pause_count} (średnia długość: ${userMetrics.avg_pause_duration_ms.toFixed(0)}ms)
- Vocabulary depth: ${userMetrics.vocab_depth_score}/100

Transkrypcja:
"""
${transcript}
"""

---

TWOJE ZADANIE:

Dajesz feedback TAK JAK TY BYŚ GO DAŁ — nie jak generyczny coach. Używaj swojego słownictwa, swoich metafor, swojego tempa, swojej brutalnej szczerości (albo swojej rozwagi — zależy kim jesteś).

Zwróć JSON (tylko JSON, zero komentarzy wokół):

{
  "in_character_verdict": "2-3 zdania napisane W TWOIM TONIE i SŁOWNICTWIE. Tak jakbyś stał obok i mówił mu prosto w twarz po nagraniu. Musi brzmieć jak TY, nie jak ChatGPT.",

  "overall_score": int 0-100 (jak TY byś ocenił to nagranie w kontekście Twoich standardów — nie uniwersalnych),

  "style_match_score": int 0-100 (jak blisko jego obecny styl jest do TWOJEGO stylu),

  "what_worked_in_your_style": [
    "3 konkretne rzeczy, które zrobił zgodnie z Twoim stylem. Cytuj konkretne fragmenty transkrypcji.",
    "...",
    "..."
  ],

  "what_violated_your_style": [
    "3 konkretne rzeczy, które zrobił ALE TY BYŚ NIGDY NIE ZROBIŁ. Odwołuj się do swoich 'never_does' i 'what_they_hate'.",
    "...",
    "..."
  ],

  "mentor_alternative_phrasing": {
    "user_said": "Zacytuj jedno konkretne zdanie, które powiedział słabo",
    "how_you_would_say_it": "Napisz jak TY byś to powiedział używając swojego słownictwa, swojej struktury, swoich tików. To ma brzmieć jak Twoja realna wypowiedź."
  },

  "three_drills_you_would_assign": [
    {
      "drill_name": "Nazwa ćwiczenia W TWOIM STYLU nazwenia rzeczy",
      "why_you_are_assigning_this": "Jedno zdanie w Twoim głosie",
      "how_to_do_it": "Konkretna instrukcja (nie ogólnik)"
    },
    {
      "drill_name": "...",
      "why_you_are_assigning_this": "...",
      "how_to_do_it": "..."
    },
    {
      "drill_name": "...",
      "why_you_are_assigning_this": "...",
      "how_to_do_it": "..."
    }
  ],

  "closing_line_in_your_voice": "Ostatnie zdanie które TY byś powiedział żegnając się po tej sesji. Motywujące/miażdżące/wzmacniające — zależy od Ciebie."
}

Nie łam roli. Nie pisz 'as an AI'. Nie używaj emoji. Pisz w języku w którym nagrał użytkownik (jeśli polski transcript → polski feedback, jeśli angielski → angielski).`;
}

/**
 * Helper do detekcji kształtu — używany przez index.ts do routingu v1/v2
 * oraz do filtrowania niekompatybilnych mentorów we fallbacku.
 */
export function isV1PersonaProfile(personaProfile: unknown): boolean {
  if (!personaProfile || typeof personaProfile !== "object") return false;
  const p = personaProfile as Record<string, unknown>;
  const identity = p.identity as Record<string, unknown> | undefined;
  return typeof identity?.one_sentence_essence === "string"
    && (identity.one_sentence_essence as string).length > 0;
}

/**
 * Interfejs odpowiedzi od GPT z analizą mentora
 */
export interface MentorAnalysisResponse {
  in_character_verdict: string;
  overall_score: number;
  style_match_score: number;
  what_worked_in_your_style: string[];
  what_violated_your_style: string[];
  mentor_alternative_phrasing: {
    user_said: string;
    how_you_would_say_it: string;
  };
  three_drills_you_would_assign: Array<{
    drill_name: string;
    why_you_are_assigning_this: string;
    how_to_do_it: string;
  }>;
  closing_line_in_your_voice: string;
}
