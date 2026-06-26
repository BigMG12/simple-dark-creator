/**
 * retry-stuck-imports
 * Internal function — called by a pg_cron + pg_net job every 10 minutes.
 *
 * WHY THIS EXISTS:
 *   The SQL function recover_stuck_imports() (migration 007) resets stuck imports
 *   from in-progress states back to 'queued'. But resetting the DB row alone isn't
 *   enough — the orchestrator Edge Function must also be triggered to actually
 *   resume processing. This function bridges that gap.
 *
 * Flow:
 *   1. Find all channel_imports with status = 'queued' that are old enough to have
 *      missed their initial orchestrator trigger (created or updated > 2 min ago).
 *   2. For each, call run-import-orchestrator (fire-and-forget via EdgeRuntime.waitUntil).
 *   3. Return a summary of how many imports were re-triggered.
 *
 * Called by:
 *   • pg_cron job 'poll_queued_imports' (migration 010) via pg_net every 10 minutes.
 *   • Can also be called manually from the Supabase dashboard for debugging.
 *
 * Auth:
 *   No user auth required — this is an internal function called with the
 *   service_role key only. It is NOT exposed to the browser.
 */

import {
  CORS_HEADERS,
  createAdminClient,
  invokeFunction,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// How old a 'queued' import must be before we consider it stuck.
// 2 minutes: enough time for the initial orchestrator trigger to have fired.
const STUCK_THRESHOLD_SECONDS = 120;

// Max imports to re-trigger per run to avoid overloading the system.
const MAX_RETRIGGERS_PER_RUN = 10;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonError("Method not allowed", 405);
  }

  // Guard: this function should only be called internally (via service_role).
  // Verify the full Bearer token matches the service_role key.
  // Supabase Edge Functions always receive the Authorization header when
  // invoked via invokeFunction() or pg_net with the service_role key.
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const expectedBearer = `Bearer ${serviceKey}`;
  if (!serviceKey || authHeader !== expectedBearer) {
    return jsonError("Forbidden — internal endpoint", 403);
  }

  const admin = createAdminClient();
  const stuckCutoff = new Date(
    Date.now() - STUCK_THRESHOLD_SECONDS * 1000,
  ).toISOString();

  // ── Find queued imports that have been waiting too long ───────────────────
  // We filter on updated_at (set by trigger on every UPDATE) rather than
  // created_at because the pg_cron recovery job updates the row to 'queued'
  // and we want to pick those up even if they were created recently.
  const { data: stuckImports, error: fetchErr } = await admin
    .from("channel_imports")
    .select("id, source_type, updated_at, retry_count")
    .eq("status", "queued")
    .lt("updated_at", stuckCutoff)
    .order("updated_at", { ascending: true })
    .limit(MAX_RETRIGGERS_PER_RUN);

  if (fetchErr) {
    console.error("retry-stuck-imports: failed to query imports:", fetchErr.message);
    return jsonError("Failed to query stuck imports", 500);
  }

  const imports = stuckImports ?? [];

  if (imports.length === 0) {
    return jsonOk({ triggered: 0, message: "No stuck imports found" });
  }

  console.log(
    `retry-stuck-imports: found ${imports.length} stuck import(s) to re-trigger`,
  );

  // ── Re-trigger orchestrator for each ─────────────────────────────────────
  const triggered: string[] = [];
  const failed: string[] = [];

  for (const imp of imports as Array<{
    id: string;
    source_type: string;
    updated_at: string;
    retry_count: number;
  }>) {
    EdgeRuntime.waitUntil(
      invokeFunction("run-import-orchestrator", { import_id: imp.id })
        .then((res) => {
          if (!res.ok) {
            console.warn(
              `retry-stuck-imports: orchestrator returned ${res.status} for import ${imp.id}`,
            );
            failed.push(imp.id);
          } else {
            console.log(
              `retry-stuck-imports: re-triggered import ${imp.id} (retry_count=${imp.retry_count})`,
            );
            triggered.push(imp.id);
          }
        })
        .catch((err: unknown) => {
          console.error(
            `retry-stuck-imports: failed to invoke orchestrator for ${imp.id}:`,
            err instanceof Error ? err.message : String(err),
          );
          failed.push(imp.id);
        }),
    );
  }

  return jsonOk({
    triggered: imports.length,
    import_ids: imports.map((i: { id: string }) => i.id),
    message: `Re-triggered ${imports.length} stuck import(s)`,
  });
});
