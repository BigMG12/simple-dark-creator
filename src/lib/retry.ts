/**
 * Exponential backoff retry helper.
 *
 * Usage:
 *   const result = await retryWithBackoff(() => fetch(url), {
 *     attempts: 4,
 *     baseMs: 500,
 *     onAttempt: (n, err) => console.log(`Retry ${n}`, err),
 *   });
 */

export interface RetryOptions<T> {
  /** Total number of attempts including the first. Default 4. */
  attempts?: number;
  /** Initial delay in ms. Default 500. */
  baseMs?: number;
  /** Cap on delay in ms. Default 8000. */
  maxMs?: number;
  /** Exponential factor. Default 2. */
  factor?: number;
  /** Jitter ratio (0-1). Default 0.2 = ±20%. */
  jitter?: number;
  /** Return false to abort retry loop early. Default: retry on network/5xx/429/timeout. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Notified before each retry attempt (attempt starts at 2). */
  onAttempt?: (attempt: number, err: unknown) => void;
  /** Optional AbortSignal to cancel between attempts. */
  signal?: AbortSignal;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions<T> = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 8000;
  const factor = opts.factor ?? 2;
  const jitter = opts.jitter ?? 0.2;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !shouldRetry(err, attempt)) throw err;

      const raw = Math.min(maxMs, baseMs * Math.pow(factor, attempt - 1));
      const spread = raw * jitter;
      const delay = Math.max(0, raw + (Math.random() * 2 - 1) * spread);

      opts.onAttempt?.(attempt + 1, err);
      await sleep(delay, opts.signal);
    }
  }

  // Unreachable, but TS wants it.
  throw lastErr;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Retry on: network errors, timeouts, HTTP 408/429/500/502/503/504.
 * Skip on: 4xx (except 408/429), abort, explicit non-retryable.
 */
export function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return false;

  const anyErr = err as {
    status?: number;
    statusCode?: number;
    code?: string;
    name?: string;
    message?: string;
    context?: { status?: number };
  } | null;

  if (!anyErr) return true;

  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.context?.status;
  if (typeof status === "number") {
    if (status === 408 || status === 429) return true;
    if (status >= 500 && status < 600) return true;
    if (status >= 400 && status < 500) return false;
  }

  const msg = (anyErr.message ?? "").toLowerCase();
  if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch")) {
    return true;
  }
  if (anyErr.name === "TypeError") return true; // fetch network failure
  return true; // default: transient
}

/**
 * Predicate: never retry after we get a structured server error with a
 * human message (validation, conflict, forbidden, etc.). Use for
 * supabase.functions.invoke where the edge function returns 4xx with
 * a specific `error` field — the client showing "Ponawiam…" would be
 * misleading.
 */
export function shouldRetryTransientOnly(err: unknown, _attempt: number): boolean {
  const anyErr = err as { status?: number; context?: { status?: number } } | null;
  const status = anyErr?.status ?? anyErr?.context?.status;
  if (typeof status === "number") {
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return false;
    }
  }
  return defaultShouldRetry(err);
}
