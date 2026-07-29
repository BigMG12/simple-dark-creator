/**
 * Lovable AI Gateway — chat completions helper.
 * Wywoluje GPT-5.6 modele przez gateway z jednym prostym API.
 *
 * Dla wszystkich modeli openai/gpt-5.6-* wymuszamy `reasoning_effort: "none"`,
 * bo /v1/chat/completions inaczej rzuca 400 kiedy zapytanie zawiera cokolwiek
 * co GPT-5.6 traktuje jak "tools". Wciąż dostajemy jakość modelu, tylko bez
 * jawnego reasoningu (który wymagałby Responses API + streamingu).
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type GatewayModel =
  | "openai/gpt-5.6-sol"     // flagowy, do glebokich analiz
  | "openai/gpt-5.6-terra"   // balansowy, default
  | "openai/gpt-5.6-luna"    // szybki/tani, sub-tasks
  | "openai/gpt-5.4-mini";   // legacy fallback

export interface GatewayChatOptions {
  model: GatewayModel;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  /** Zostanie zignorowany dla gpt-5.6-* (nie akceptuje custom temperature) */
  temperature?: number;
  timeoutMs?: number;
}

export interface GatewayChatError extends Error {
  status?: number;
  bodyText?: string;
}

export async function callGatewayChat(opts: GatewayChatOptions): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not set — cannot call Lovable AI Gateway");
  }

  const isGpt56 = opts.model.startsWith("openai/gpt-5.6");

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  if (isGpt56) {
    // gpt-5.6 na chat completions odrzuca custom temperature i wymaga
    // wylaczenia reasoningu, inaczej 400 przy niektorych zapytaniach.
    body.reasoning_effort = "none";
  } else if (typeof opts.temperature === "number") {
    body.temperature = opts.temperature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 120_000,
  );

  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Lovable AI Gateway ${res.status}: ${text.slice(0, 500)}`,
    ) as GatewayChatError;
    err.status = res.status;
    err.bodyText = text;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("Lovable AI Gateway zwrocilo pusta tresc");
  }
  return content;
}

/** Wywoluje gateway i parsuje JSON z odpowiedzi. */
export async function callGatewayJson<T = unknown>(
  opts: GatewayChatOptions,
): Promise<T> {
  const raw = await callGatewayChat({ ...opts, jsonMode: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Model czasem zwraca ```json ... ``` — sprobujmy strip
    const stripped = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(stripped) as T;
  }
}
