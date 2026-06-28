// supabase/functions/analyze-sentences/index.ts
// Per-sentence analysis for chess.com-style results UI.
// Input:  { recording_id: string }
// Effect: upserts analyses.sentence_analyses (jsonb array) for that recording.
// Safe to fail — main analyze-recording flow doesn't depend on this.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WhisperSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
}
interface WhisperWord {
  word: string;
  start: number;
  end: number;
}
interface WhisperBlob {
  segments?: WhisperSegment[];
  words?: WhisperWord[];
  duration?: number;
}

interface SentenceAnalysis {
  index: number;
  text: string;
  start: number;
  end: number;
  score: number; // 0-100
  mentor_commentary: string;
  alternative: string;
  explanation: string;
}

/** PL-aware sentence split. Keeps terminators, skips common abbreviations. */
function splitSentencesPL(input: string): string[] {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const ABBR = /\b(np|tj|tzn|tzw|itd|itp|m\.in|prof|dr|hab|inż|mgr|św|wg|ok|str|nr|r|w|p|s)\.$/i;
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    buf += text[i];
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?") {
      const next = text[i + 1];
      if (!next || next === " ") {
        const trimmed = buf.trim();
        if (ABBR.test(trimmed)) continue;
        if (trimmed.length > 0) out.push(trimmed);
        buf = "";
      }
    }
  }
  const tail = buf.trim();
  if (tail.length > 0) out.push(tail);
  return out;
}

/** Map sentence to [start,end] via Whisper words (fuzzy by token order). */
function matchTimestamps(
  sentence: string,
  words: WhisperWord[],
  cursor: { i: number },
): { start: number; end: number } {
  const tokens = sentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0 || words.length === 0) {
    return { start: 0, end: 0 };
  }
  let startIdx = -1;
  let endIdx = -1;
  let matched = 0;
  const need = Math.max(1, Math.floor(tokens.length * 0.6));
  for (let i = cursor.i; i < words.length && matched < tokens.length; i++) {
    const w = words[i].word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
    if (!w) continue;
    if (w === tokens[matched] || tokens[matched].startsWith(w) || w.startsWith(tokens[matched])) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
      matched++;
    }
  }
  if (matched >= need && startIdx !== -1 && endIdx !== -1) {
    cursor.i = endIdx + 1;
    return { start: words[startIdx].start, end: words[endIdx].end };
  }
  // Fallback: proportional slice based on cursor progress.
  const fallbackStart = words[Math.min(cursor.i, words.length - 1)]?.start ?? 0;
  const fallbackEnd =
    words[Math.min(cursor.i + tokens.length, words.length - 1)]?.end ?? fallbackStart;
  cursor.i = Math.min(cursor.i + tokens.length, words.length);
  return { start: fallbackStart, end: fallbackEnd };
}

async function gptPerSentence(
  apiKey: string,
  sentences: { index: number; text: string }[],
  mentorPersona: unknown,
): Promise<
  Record<number, { score: number; mentor_commentary: string; alternative: string; explanation: string }>
> {
  const sys = `Jesteś mentorem mówcy. Oceniasz POJEDYNCZE zdania nagrania użytkownika z perspektywy poniższej persony mentora.
Dla KAŻDEGO zdania zwróć: score (0-100), mentor_commentary (1-2 zdania, ostro i konkretnie, po polsku, w głosie mentora), alternative (jak mentor powiedziałby to zdanie, po polsku), explanation (1 zdanie — dlaczego ta wersja jest lepsza).
Persona mentora (JSON): ${JSON.stringify(mentorPersona ?? {}).slice(0, 4000)}
Odpowiedz WYŁĄCZNIE jako JSON: { "items": [ { "index": <number>, "score": <number>, "mentor_commentary": "...", "alternative": "...", "explanation": "..." } ] }`;

  const user = `Zdania do oceny:\n${sentences.map((s) => `[${s.index}] ${s.text}`).join("\n")}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const map: Record<number, { score: number; mentor_commentary: string; alternative: string; explanation: string }> = {};
  for (const it of parsed.items ?? []) {
    if (typeof it?.index === "number") {
      map[it.index] = {
        score: Math.max(0, Math.min(100, Number(it.score) || 0)),
        mentor_commentary: String(it.mentor_commentary ?? ""),
        alternative: String(it.alternative ?? ""),
        explanation: String(it.explanation ?? ""),
      };
    }
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recording_id } = await req.json().catch(() => ({}));
    if (!recording_id || typeof recording_id !== "string") {
      return new Response(
        JSON.stringify({ error: "recording_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY missing");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: rec, error: recErr } = await admin
      .from("recordings")
      .select("id, transcript, whisper_segments")
      .eq("id", recording_id)
      .single();
    if (recErr || !rec) throw new Error(`recording not found: ${recErr?.message}`);

    const whisper = (rec.whisper_segments ?? {}) as WhisperBlob;
    const words = whisper.words ?? [];
    const transcript = (rec.transcript ?? "").trim();
    if (!transcript) {
      return new Response(JSON.stringify({ ok: true, skipped: "empty transcript" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: analysisRow, error: aErr } = await admin
      .from("analyses")
      .select("id, mentor_persona_snapshot, sentence_analyses")
      .eq("recording_id", recording_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr || !analysisRow) {
      throw new Error(`analysis not found for recording: ${aErr?.message}`);
    }
    if (analysisRow.sentence_analyses) {
      return new Response(JSON.stringify({ ok: true, skipped: "already analyzed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Split sentences
    const rawSentences = splitSentencesPL(transcript);
    if (rawSentences.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no sentences" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Match timestamps
    const cursor = { i: 0 };
    const withTimes = rawSentences.map((text, index) => {
      const { start, end } = matchTimestamps(text, words, cursor);
      return { index, text, start, end };
    });

    // 3) GPT per-sentence (single call, batched)
    const gptMap = await gptPerSentence(
      openaiKey,
      withTimes.map(({ index, text }) => ({ index, text })),
      analysisRow.mentor_persona_snapshot,
    );

    // 4) Compose final array
    const sentence_analyses: SentenceAnalysis[] = withTimes.map((s) => {
      const g = gptMap[s.index] ?? {
        score: 50,
        mentor_commentary: "",
        alternative: "",
        explanation: "",
      };
      return {
        index: s.index,
        text: s.text,
        start: s.start,
        end: s.end,
        score: g.score,
        mentor_commentary: g.mentor_commentary,
        alternative: g.alternative,
        explanation: g.explanation,
      };
    });

    const { error: upErr } = await admin
      .from("analyses")
      .update({ sentence_analyses })
      .eq("id", analysisRow.id);
    if (upErr) throw new Error(`update failed: ${upErr.message}`);

    return new Response(
      JSON.stringify({ ok: true, count: sentence_analyses.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[analyze-sentences] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
