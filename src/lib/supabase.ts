import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ⚠️  HARDCODED REAL BACKEND — DO NOT REPLACE WITH import.meta.env READS.
 *
 * Tło: Lovable Cloud jest WŁĄCZONA na tym projekcie i nie da się jej wyłączyć.
 * Platforma nadpisuje `.env` (VITE_SUPABASE_URL / _ANON_KEY / _PROJECT_ID /
 * _PUBLISHABLE_KEY) wartościami pustego projektu Cloud `pxbzfbhhhrtdvkbrqqfn`
 * przy każdym restarcie / reconnect. Wszystkie dane, konta, edge functions
 * i migracje żyją na zewnętrznym projekcie `hthjuoswarvsfssxqxxj`.
 *
 * Żeby front zawsze trafiał w prawdziwy backend — niezależnie od stanu `.env`
 * — URL i publishable key są tu HARDCODED. Publishable key jest bezpieczny
 * w kodzie (to nie service role).
 *
 * Jeśli kiedyś migrujesz na Cloud, to wtedy (i tylko wtedy) wróć do
 * `import.meta.env.*`. Do tego czasu — ZOSTAW.
 */
const REAL_SUPABASE_URL = "https://hthjuoswarvsfssxqxxj.supabase.co";
const REAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable__gOJ0v5RrfqBBOwhzlxG9g_nC3pYfQC";

export const hasSupabaseConfig = true;

export const supabase: SupabaseClient = createClient(
  REAL_SUPABASE_URL,
  REAL_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
