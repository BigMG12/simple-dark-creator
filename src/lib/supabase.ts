import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  if (value.includes("YOUR-PROJECT-REF") || value.includes("placeholder")) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return false;
    // Accept *.supabase.co or *.supabase.in (custom domains rare here)
    if (!/\.supabase\.(co|in)$/i.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function isValidKey(value: string | undefined): value is string {
  if (!value) return false;
  if (value.includes("YOUR-ANON-KEY") || value.includes("placeholder")) return false;
  // Accept legacy JWT (eyJ...) or new publishable keys (sb_publishable_...)
  return value.length > 20;
}

export const hasSupabaseConfig = isValidSupabaseUrl(rawUrl) && isValidKey(rawKey);

if (!hasSupabaseConfig && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing or invalid. " +
      "Auth & backend features are disabled until you set valid values in Workspace Settings → Build Secrets. " +
      `Current URL valid: ${isValidSupabaseUrl(rawUrl)}, key valid: ${isValidKey(rawKey)}`
  );
}

function createSafeClient(): SupabaseClient {
  if (hasSupabaseConfig) {
    try {
      return createClient(rawUrl!, rawKey!);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[supabase] createClient failed, falling back to placeholder.", err);
    }
  }
  // Always return a benign placeholder so module import never throws.
  return createClient("https://placeholder.supabase.co", "placeholder-anon-key");
}

export const supabase: SupabaseClient = createSafeClient();
