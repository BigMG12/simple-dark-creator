/**
 * analyze-sentences
 *
 * Wywoływana fire-and-forget przez analyze-recording.
 * Generuje per-zdanie chess-style analysis.
 */
import {
  createAdminClient,
  jsonError,
  jsonOk,
  CORS_HEADERS,
} from "../_shared/supabase-admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { recording_id, analysis_id } = body;
    if (!recording_id || !analysis_id) {
      return jsonError("Missing recording_id or analysis_id", 400);
    }

    const admin = createAdminClient();

    // 1. Recording
    const { data: recording, error: recErr } = await admin
      .from("recordings")
      .select("id, transcript, whisper_segments, duration_seconds, topic")
      .eq("id", recording_id)
      .single();
    if (recErr || !recording) {
      console.error("[analyze-sentences] Recording fetch failed:", recErr);
      return jsonError("Recording not found", 404);
    }
    if (!recording.transcript || recording.transcript.length < 10) {
      return jsonError("No transcript to analyze", 400);
    }

    // 2. Analysis
    const { data: analysis, error: anaErr } = await admin
      .from("analyses")
      .select(
        "id, mentor_persona_snapshot, overall_score, compared_to_speaker_id",
      )
      .eq("id", analysis_id)
      .single();
    if (anaErr || !analysis) {
      console.error("[analyze-sentences] Analysis fetch failed:", anaErr);
      return jsonError("Analysis not found", 404);
    }

    // 3. Split sentences
    const sentences = splitIntoSentences(recording.transcript);
    if (sentences.length === 0) {
      console.warn("[analyze-sentences] No sentences extracted");
      return jsonOk({ sentences: [] });
    }
    console.log(`[analyze-sentences] Extracted ${sentences.length} sentences`);

    // 4. Timestamps — whisper_segments stored as { segments, words, duration }
    const ws = recording.whisper_segments as any;
    const segmentsArray: any[] = Array.isArray(ws)
      ? ws
      : Array.isArray(ws?.segments)
        ? ws.segments
        : [];
    const sentencesWithTimestamps = matchSentencesWithSegments(
      sentences,
      segmentsArray,
    );

    // 5. GPT-4o
    const mentorDNA = analysis.mentor_persona_snapshot;
    if (!mentorDNA) {
      return jsonError("No mentor DNA in analysis", 500);
    }

    const analyzed = await analyzeSentencesWithGPT4o(
      sentencesWithTimestamps,
      mentorDNA,
      recording.topic,
    );

    // 6. Save
    const { error: updateErr } = await admin
      .from("analyses")
      .update({ sentence_analyses: analyzed })
      .eq("id", analysis_id);
    if (updateErr) {
      console.error("[analyze-sentences] Save failed:", updateErr);
      return jsonError("Failed to save sentence analyses", 500);
    }

    console.log(
      `[analyze-sentences] Saved ${analyzed.length} sentence analyses`,
    );
    return jsonOk({ count: analyzed.length });
  } catch (err) {
    console.error("[analyze-sentences] Fatal error:", err);
    return jsonError((err as Error).message || "Unknown error", 500);
  }
});

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  const abbreviations = [
    "p\\.", "dr\\.", "mgr\\.", "prof\\.", "np\\.", "tj\\.", "tzn\\.",
    "m\\.in\\.", "tzw\\.", "św\\.", "inż\\.", "mgr inż\\.",
    "ul\\.", "al\\.", "pl\\.", "os\\.", "nr\\.", "r\\.", "wg\\.",
  ];

  let protectedText = text;
  abbreviations.forEach((abbr, idx) => {
    const regex = new RegExp(abbr, "gi");
    protectedText = protectedText.replace(regex, `__ABBR_${idx}__`);
  });

  const rawSentences = protectedText
    .split(/(?<=[.!?])\s+(?=[A-ZŚĆĘŁŃÓŻŹ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const sentences = rawSentences.map((s) => {
    let restored = s;
    abbreviations.forEach((abbr, idx) => {
      restored = restored.replace(
        new RegExp(`__ABBR_${idx}__`, "g"),
        abbr.replace(/\\/g, ""),
      );
    });
    return restored;
  });

  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }
  return sentences;
}

interface SentenceWithTime {
  index: number;
  text: string;
  start_seconds: number;
  end_seconds: number;
}

function matchSentencesWithSegments(
  sentences: string[],
  segments: any[],
): SentenceWithTime[] {
  if (!segments || segments.length === 0) {
    const totalDuration = 60;
    const slotDuration = totalDuration / sentences.length;
    return sentences.map((text, idx) => ({
      index: idx,
      text,
      start_seconds: Math.round(idx * slotDuration),
      end_seconds: Math.round((idx + 1) * slotDuration),
    }));
  }

  let fullText = "";
  const segmentBoundaries: {
    start: number;
    end: number;
    segStart: number;
    segEnd: number;
  }[] = [];

  for (const seg of segments) {
    const startChar = fullText.length;
    fullText += seg.text + " ";
    const endChar = fullText.length;
    segmentBoundaries.push({
      start: startChar,
      end: endChar,
      segStart: seg.start,
      segEnd: seg.end,
    });
  }

  const result: SentenceWithTime[] = [];
  let searchFromChar = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const firstWords = sentence.split(" ").slice(0, 4).join(" ");
    const charPos = fullText
      .toLowerCase()
      .indexOf(firstWords.toLowerCase(), searchFromChar);

    let startSeconds = 0;
    let endSeconds = 0;

    if (charPos !== -1) {
      const startSeg = segmentBoundaries.find(
        (sb) => sb.start <= charPos && charPos < sb.end,
      );
      if (startSeg) startSeconds = startSeg.segStart;

      const lastWords = sentence.split(" ").slice(-3).join(" ");
      const endCharPos = fullText
        .toLowerCase()
        .indexOf(lastWords.toLowerCase(), charPos + firstWords.length);

      if (endCharPos !== -1) {
        const endSeg = segmentBoundaries.find(
          (sb) => sb.start <= endCharPos && endCharPos < sb.end,
        );
        if (endSeg) endSeconds = endSeg.segEnd;
      } else {
        if (i + 1 < sentences.length) {
          endSeconds = startSeconds + 5;
        } else {
          endSeconds =
            segments[segments.length - 1]?.end || startSeconds + 5;
        }
      }
      searchFromChar = charPos + firstWords.length;
    } else {
      const totalDuration = segments[segments.length - 1]?.end || 60;
      const slotDuration = totalDuration / sentences.length;
      startSeconds = Math.round(i * slotDuration);
      endSeconds = Math.round((i + 1) * slotDuration);
    }

    result.push({
      index: i,
      text: sentence,
      start_seconds: Math.round(startSeconds * 100) / 100,
      end_seconds: Math.round(endSeconds * 100) / 100,
    });
  }

  return result;
}

async function analyzeSentencesWithGPT4o(
  sentences: SentenceWithTime[],
  mentorDNA: any,
  topic: string | null,
): Promise<any[]> {
  const mentorName =
    mentorDNA.LAYER_1_identity?.name ||
    mentorDNA.identity?.name ||
    "Mentor";

  const systemPrompt = `
Jestes ${mentorName}.

TWOJE 12-WARSTWOWE DNA:
${JSON.stringify(mentorDNA, null, 2).slice(0, 6000)}

ZADANIE: Ocen KAZDE zdanie usera per-sentence. To jest jak chess.com — pokazujesz dokladnie GDZIE byl error, jak to poprawic, JAKIEJ techniki uzyc i dlaczego to wazne.

DLA KAZDEGO ZDANIA zwroc JSON:
{
  "index": <int>,
  "text": "<oryginalne zdanie>",
  "start_seconds": <float>,
  "end_seconds": <float>,
  "score": <int 0-100>,
  "label": "critical" | "weak" | "good" | "excellent",
  "severity": "info" | "warn" | "critical",
  "mentor_commentary": "<2-3 zdania W TWOIM STYLU po polsku>",
  "alternative": "<jak BY POWIEDZIAL TO MENTOR — konkretna alternatywa>",
  "rewrite": "<JEDNA konkretna lepsza wersja tego zdania w Twoim stylu — do skopiowania>",
  "why_it_matters": "<1 zdanie: dlaczego to wazne w Twoim stylu>",
  "technique_tag": "<krotki tag np. 'pauza-po-kluczowym-slowie' | 'trojka-retoryczna' | 'kill-filler' | 'konkretna-liczba' | 'signature-move' | 'brak-hooka' | 'vague-language'>",
  "explanation": "<dlaczego to wazne — 1-2 zdania>"
}

RUBRYKA SCORING (rygorystycznie):
- excellent (85+): mocne otwarcie, konkretna liczba/fakt, pewnosc, signature move tego mentora → severity=info
- good (70-84): solidne, na temat, bez bledow, ale brak iskry → severity=info
- weak (40-69): fillery, niepewnosc, vague, "mysle ze", "moze" → severity=warn
- critical (<40): 3+ fillery, "super fajne", "naprawde", "dla kazdego", brak tresci → severity=critical

TON KOMENTARZY: SCISLE W STYLU MENTORA. NIE uzywaj generycznych fraz "cos do poprawy". Bezposrednio, brutalnie, konkretnie.

ZWROC TYLKO JSON: { "sentences": [...] } z dokladnie ${sentences.length} elementami.
`;

  const userPrompt = `
TEMAT NAGRANIA: ${topic || "Brak"}

ZDANIA DO ANALIZY:
${sentences
  .map(
    (s) =>
      `[${s.index}] (${s.start_seconds}s-${s.end_seconds}s): "${s.text}"`,
  )
  .join("\n")}

Ocen kazde i zwroc JSON: { "sentences": [...] }
`;

  // Wywolaj GPT-5.6-sol (flagowy reasoning model) przez Lovable AI Gateway
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not set");

  const gatewayResp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    },
  );

  if (!gatewayResp.ok) {
    const errText = await gatewayResp.text();
    console.error("[analyze-sentences] Gateway failed:", errText);
    throw new Error(`Gateway ${gatewayResp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await gatewayResp.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch (e) {
    console.error("[analyze-sentences] JSON parse failed:", e);
    throw new Error("Malformed gateway response");
  }

  const sentencesArray = parsed.sentences || parsed.array || parsed;
  if (!Array.isArray(sentencesArray)) {
    throw new Error("Gateway response is not an array");
  }

  // Pad/truncate to match input length exactly
  const aligned: any[] = [];
  for (let idx = 0; idx < sentences.length; idx++) {
    const original = sentences[idx];
    const s = sentencesArray[idx] || {};
    const rawScore = typeof s.score === "number" && Number.isFinite(s.score) ? s.score : 50;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const label = ["critical", "weak", "good", "excellent"].includes(s.label)
      ? s.label
      : score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 40 ? "weak" : "critical";
    const severity = ["info", "warn", "critical"].includes(s.severity)
      ? s.severity
      : score >= 65 ? "info" : score >= 40 ? "warn" : "critical";

    aligned.push({
      index: idx,
      text: original?.text || s.text || "",
      start_seconds: original?.start_seconds ?? 0,
      end_seconds: original?.end_seconds ?? (original?.start_seconds ?? 0) + 5,
      score,
      label,
      severity,
      mentor_commentary: s.mentor_commentary || "",
      alternative: s.alternative || "",
      rewrite: s.rewrite || s.alternative || "",
      why_it_matters: s.why_it_matters || "",
      technique_tag: s.technique_tag || "",
      explanation: s.explanation || "",
    });
  }
  return aligned;
}

