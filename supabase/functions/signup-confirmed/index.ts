/**
 * signup-confirmed
 * Tworzy nowego użytkownika z auto-potwierdzonym mailem (email_confirm: true).
 * Omija ustawienie "Confirm email" w panelu Supabase Auth.
 *
 * Wywoływane z klienta podczas rejestracji.
 * Wymaga: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Supabase nadaje automatycznie).
 */

import { CORS_HEADERS, createAdminClient, jsonError, jsonOk } from "../_shared/supabase-admin.ts";

interface Payload {
  email: string;
  password: string;
  full_name?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { email, password, full_name } = payload;
  if (!email || typeof email !== "string") return jsonError("email is required", 400);
  if (!password || typeof password !== "string") return jsonError("password is required", 400);
  if (password.length < 8) return jsonError("password must be at least 8 characters", 400);

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : undefined,
  });

  if (error) {
    const status = error.status ?? 400;
    return jsonError(error.message, status >= 400 && status < 600 ? status : 400);
  }

  return jsonOk({ user_id: data.user?.id, email: data.user?.email });
});
