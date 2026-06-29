/**
 * enrich-sentences-with-prosody
 *
 * Merges sentence_analyses (Megapromt 7) with prosody_data (Hume).
 * Adds prosody.{top_emotion, emoji, tag, emotions_top5} to each sentence.
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
    const { analysis_id } = await req.json();
    if (!analysis_id) return jsonError("Missing analysis_id", 400);

    const admin = createAdminClient();

    const { data: analysis, error } = await admin
      .from("analyses")
      .select("id, sentence_analyses, prosody_data")
      .eq("id", analysis_id)
      .single();

    if (error || !analysis) return jsonError("Analysis not found", 404);

    if (!analysis.sentence_analyses || !analysis.prosody_data) {
      console.log("[enrich] Waiting for both sentence_analyses & prosody_data");
      return jsonOk({ deferred: true });
    }

    // deno-lint-ignore no-explicit-any
    const sentences = analysis.sentence_analyses as any[];
    // deno-lint-ignore no-explicit-any
    const utterances: any[] = (analysis.prosody_data as any).utterances || [];

    if (!Array.isArray(sentences) || sentences.length === 0) {
      return jsonOk({ enriched: 0, reason: "No sentences" });
    }

    const enriched = sentences.map((s) => {
      const matchingUtt = findBestMatchingUtterance(s, utterances);
      if (!matchingUtt) return { ...s, prosody: null };

      const topEmotion = getTopEmotion(matchingUtt.emotions);
      const emoji = emotionToEmoji(topEmotion?.name);
      const tag = emotionToPolishTag(topEmotion?.name);

      return {
        ...s,
        prosody: {
          top_emotion: topEmotion?.name || null,
          top_emotion_score: topEmotion?.score || 0,
          emoji,
          tag,
          emotions_top5: [...matchingUtt.emotions]
            // deno-lint-ignore no-explicit-any
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5)
            // deno-lint-ignore no-explicit-any
            .map((e: any) => ({
              name: e.name,
              polish_name: emotionToPolishTag(e.name),
              score: Math.round(e.score * 100),
            })),
        },
      };
    });

    const { error: updateErr } = await admin
      .from("analyses")
      .update({ sentence_analyses: enriched })
      .eq("id", analysis_id);

    if (updateErr) return jsonError("Failed to save enriched sentences", 500);

    return jsonOk({ enriched: enriched.length });
  } catch (err) {
    console.error("[enrich] Fatal:", err);
    return jsonError(
      err instanceof Error ? err.message : "Unknown error",
      500,
    );
  }
});

// deno-lint-ignore no-explicit-any
function findBestMatchingUtterance(sentence: any, utterances: any[]) {
  let best = null;
  let bestOverlap = 0;
  for (const utt of utterances) {
    const overlapStart = Math.max(sentence.start_seconds, utt.start_seconds);
    const overlapEnd = Math.min(sentence.end_seconds, utt.end_seconds);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = utt;
    }
  }
  return best;
}

// deno-lint-ignore no-explicit-any
function getTopEmotion(emotions: any[]) {
  if (!emotions || emotions.length === 0) return null;
  // deno-lint-ignore no-explicit-any
  return emotions.reduce((max: any, e: any) => (e.score > max.score ? e : max));
}

function emotionToEmoji(name: string | undefined): string {
  if (!name) return "😐";
  const map: Record<string, string> = {
    Confidence: "💪",
    Excitement: "🔥",
    Determination: "⚡",
    Calmness: "😌",
    Joy: "😊",
    Enthusiasm: "🚀",
    Satisfaction: "✨",
    Triumph: "🏆",
    Doubt: "🤔",
    Tiredness: "😴",
    Awkwardness: "😬",
    Boredom: "😑",
    Anxiety: "😰",
    Confusion: "😕",
    Disappointment: "😔",
    Embarrassment: "😳",
    Sadness: "😢",
    Anger: "😠",
    Fear: "😨",
  };
  return map[name] || "😐";
}

function emotionToPolishTag(name: string | undefined): string {
  if (!name) return "Neutralny";
  const map: Record<string, string> = {
    Confidence: "Pewny",
    Excitement: "Energetyczny",
    Determination: "Zdeterminowany",
    Calmness: "Spokojny",
    Joy: "Radosny",
    Enthusiasm: "Entuzjastyczny",
    Satisfaction: "Usatysfakcjonowany",
    Triumph: "Triumfalny",
    Doubt: "Niepewny",
    Tiredness: "Zmęczony",
    Awkwardness: "Niezręczny",
    Boredom: "Znudzony",
    Anxiety: "Niespokojny",
    Confusion: "Zagubiony",
    Disappointment: "Rozczarowany",
    Embarrassment: "Zażenowany",
    Sadness: "Smutny",
    Anger: "Zły",
    Fear: "Wystraszony",
  };
  return map[name] || name;
}
