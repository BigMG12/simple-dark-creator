/**
 * AI Enrichment dla mentorów v1.
 *
 * Stary schemat v1 daje listę naruszeń + alternative phrasing, ale brakuje mu
 * pól w stylu mentora wymaganych przez Learning Results System (moment,
 * diagnosis, prescription, push_to_action). Ten moduł wywołuje Lovable AI
 * Gateway żeby DOGENEROWAĆ te pola w głosie mentora.
 *
 * Wszystko jest non-fatal — jeśli AI padnie, wracamy do prostego mappingu.
 */

import type { MentorAnalysisResponse } from "./mentor-prompt-builder.ts";
import type { MentorAnalysisResponseV2 } from "./mentor-prompt-builder-v2.ts";
import type { SpeakerWithCategory } from "./types.ts";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface EnrichInput {
  v1: MentorAnalysisResponse;
  speaker: SpeakerWithCategory;
  transcript: string;
}

type V2WithoutScore = Omit<MentorAnalysisResponseV2, "verdict_score_0_100" | "verdict_label">;

/**
 * Buduje prompt który prosi model o wcielenie się w mentora i przepisanie
 * jego analizy w spójny, brutalny, OSOBISTY styl — zamiast generycznych
 * "Mentor zwrócił uwagę na elementy do poprawy".
 */
function buildEnrichmentPrompt({ v1, speaker, transcript }: EnrichInput): string {
  const persona = (speaker.persona_profile ?? {}) as Record<string, unknown>;
  const identity = (persona.identity ?? {}) as Record<string, unknown>;
  const essence = identity.one_sentence_essence ?? speaker.signature_trait ?? "";
  const archetype = identity.archetype ?? "";
  const violations = (v1.what_violated_your_style ?? []).slice(0, 3).join(" | ");
  const wins = (v1.what_worked_in_your_style ?? []).slice(0, 2).join(" | ");
  const altSaid = v1.mentor_alternative_phrasing?.user_said ?? "";
  const altHow = v1.mentor_alternative_phrasing?.how_you_would_say_it ?? "";
  const drill = v1.three_drills_you_would_assign?.[0];

  return `Jesteś ${speaker.name}. Twoja istota: "${essence}". Archetyp: "${archetype}".

Klient właśnie nagrał wystąpienie. Twoja wstępna analiza:
- Werdykt (1 zdanie): "${v1.in_character_verdict}"
- Co poszło źle: ${violations || "(brak)"}
- Co poszło dobrze: ${wins || "(brak)"}
- Klient powiedział: "${altSaid}"
- Ty powiedziałbyś: "${altHow}"
- Twoje ćwiczenie: "${drill?.drill_name ?? ""}"

Transkrypt nagrania (pierwsze 600 znaków):
"""
${transcript.slice(0, 600)}
"""

Twoje zadanie: zwróć JSON który BRZMI JAK TY (nie jak narrator AI). Bezpośrednio, brutalnie, w drugiej osobie. Bez nawiasów, bez "klient", bez "uczeń" — mówisz DO niego.

Wymagany kształt:
{
  "what_was_concrete_problem": {
    "moment": "Jeden konkretny moment z transkryptu — ZACYTUJ frazę klienta i powiedz dlaczego ona ssie. 1-2 zdania.",
    "diagnosis": "DLACZEGO tak mówisz. Co to mówi o jego psychice / przygotowaniu. 1-2 zdania w Twoim stylu.",
    "what_client_thought": "Krótka projekcja: co on sobie myślał kiedy to mówił. 1 zdanie."
  },
  "concrete_prescription": {
    "instead_of": "Konkretna fraza z transkryptu którą ma przestać mówić.",
    "say_this": "Konkretna fraza w Twoich słowach którą ma mówić zamiast.",
    "why_this_works": "Dlaczego Twoja wersja działa. 1-2 zdania, brutalnie."
  },
  "push_to_action": "Twoje closing line. Jedno zdanie, mocne, zostawiające ślad. W Twoim stylu — jeśli jesteś Top G to w stylu Top G, jeśli jesteś Goggins to Goggins.",
  "next_drill_recommendation": {
    "drill_name": "${drill?.drill_name ?? "Daily reps"}",
    "why_this_drill": "Dlaczego TO ćwiczenie, w Twoich słowach. 1 zdanie.",
    "how_to_do_it": "Konkretne kroki. 2-3 zdania."
  }
}

ZWRÓĆ TYLKO JSON. Bez komentarzy. Bez markdown.`;
}

/**
 * Próbuje wzbogacić analizę v1 o pola w stylu mentora przez Lovable AI.
 * Zwraca null jeśli cokolwiek się nie powiedzie — wywołujący ma fallback.
 */
export async function enrichV1WithAI(
  input: EnrichInput,
  lovableApiKey: string,
): Promise<V2WithoutScore | null> {
  try {
    const prompt = buildEnrichmentPrompt(input);

    const resp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Jesteś mentorem ze sceny. Mówisz do swojego ucznia bezpośrednio, brutalnie, konkretnie. Zawsze zwracasz TYLKO czysty JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      console.warn(
        `[v1-enrichment] gateway ${resp.status}: ${(await resp.text()).slice(0, 200)}`,
      );
      return null;
    }

    const data = await resp.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as V2WithoutScore;

    // Minimalna walidacja kształtu — jeśli AI zwróci śmieci, lepiej fallback
    if (
      !parsed.what_was_concrete_problem?.moment ||
      !parsed.concrete_prescription?.say_this ||
      !parsed.push_to_action ||
      !parsed.next_drill_recommendation?.drill_name
    ) {
      console.warn("[v1-enrichment] AI zwróciło niekompletny JSON, fallback");
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn(
      "[v1-enrichment] non-fatal error:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
