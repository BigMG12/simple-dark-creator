/**
 * _shared/supabase-admin.ts
 * Factory helpers for Supabase clients inside Edge Functions.
 * The admin (service_role) client bypasses RLS — never expose it to the browser.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

export function getEnvOrThrow(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

/** Service-role client — bypasses RLS. Use only inside Edge Functions. */
export function createAdminClient(): SupabaseClient {
  return createClient(
    getEnvOrThrow("SUPABASE_URL"),
    getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

/** Anon client scoped to the request's JWT — respects RLS. */
export function createUserClient(authorizationHeader: string): SupabaseClient {
  return createClient(
    getEnvOrThrow("SUPABASE_URL"),
    getEnvOrThrow("SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: authorizationHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

// ---------------------------------------------------------------------------
// Inter-function invocation
// ---------------------------------------------------------------------------

/**
 * Calls another Supabase Edge Function with the service_role key.
 * Returns the fetch Response (caller decides whether to await body or not).
 *
 * For fire-and-forget pattern wrap in EdgeRuntime.waitUntil():
 *   EdgeRuntime.waitUntil(invokeFunction("my-fn", payload));
 */
export function invokeFunction(
  functionName: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const supabaseUrl = getEnvOrThrow("SUPABASE_URL");
  const serviceRoleKey = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");

  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Shared HTTP helpers
// ---------------------------------------------------------------------------

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

export function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}
