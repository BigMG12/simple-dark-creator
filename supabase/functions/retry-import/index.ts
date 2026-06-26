/**
 * retry-import
 * HTTP POST — called from the frontend to re-run a failed import.
 *
 * Flow:
 *   1. Verify JWT — only the import owner may retry
 *   2. Load channel_imports row — must be in 'failed' status
 *   3. Delete leftover transcript_jobs (failed / pending from prior attempt)
 *      so the orchestrator inserts a clean set on the next run
 *   4. Reset channel_imports to 'queued', increment retry_count
 *   5. Write a 'retry_attempted' row to import_events
 *   6. Trigger run-import-orchestrator (fire-and-forget)
 *   7. Return { success: true, import_id }
 */

import {
  CORS_HEADERS,
  createAdminClient,
  createUserClient,
  invokeFunction,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Missing Authorization header", 401);

  const { data: { user }, error: authError } = await createUserClient(
    authHeader,
  ).auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let import_id: string;
  try {
    const body = await req.json();
    import_id = body?.import_id;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!import_id) return jsonError("import_id is required", 400);

  const admin = createAdminClient();

  // ── Fetch import row ──────────────────────────────────────────────────────
  const { data: importRow, error: fetchError } = await admin
    .from("channel_imports")
    .select("id, user_id, status, retry_count")
    .eq("id", import_id)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      retry_count: number;
    }>();

  if (fetchError) {
    console.error("retry-import: fetch error", fetchError);
    return jsonError("Failed to fetch import", 500);
  }

  if (!importRow) return jsonError("Import not found", 404);

  // ── Ownership check ───────────────────────────────────────────────────────
  if (importRow.user_id !== user.id) return jsonError("Forbidden", 403);

  // ── Status check ──────────────────────────────────────────────────────────
  if (importRow.status !== "failed") {
    return jsonError(
      `Import is not in failed state (current: ${importRow.status})`,
      400,
    );
  }

  // ── Clean up leftover transcript_jobs ─────────────────────────────────────
  // Deleting failed and pending jobs lets the orchestrator insert a fresh set
  // without creating duplicates. 'complete' jobs are left so no work is lost
  // if this was a partial failure (orchestrator will skip already-complete jobs
  // via idempotency checks — though currently it re-inserts all, so we delete all).
  const { error: cleanupErr } = await admin
    .from("transcript_jobs")
    .delete()
    .eq("import_id", import_id);

  if (cleanupErr) {
    // Non-fatal: log but continue. Orchestrator will see stale jobs but will
    // still insert new pending jobs; process-transcripts handles duplicates.
    console.warn(
      "retry-import: failed to clean up transcript_jobs:",
      cleanupErr.message,
    );
  }

  // ── Reset import to 'queued' ──────────────────────────────────────────────
  const newRetryCount = (importRow.retry_count ?? 0) + 1;

  const { error: updateError } = await admin
    .from("channel_imports")
    .update({
      status: "queued",
      error_message: null,
      progress_current: 0,
      progress_total: 0,
      retry_count: newRetryCount,
    })
    .eq("id", import_id);

  if (updateError) {
    console.error("retry-import: update error", updateError);
    return jsonError("Failed to requeue import", 500);
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await admin.from("import_events").insert({
    import_id,
    event_type: "retry_attempted",
    event_data: {
      retried_by: "user",
      user_id: user.id,
      new_retry_count: newRetryCount,
    },
  });

  // ── Trigger run-import-orchestrator (fire-and-forget) ─────────────────────
  EdgeRuntime.waitUntil(
    invokeFunction("run-import-orchestrator", { import_id }).catch(
      (err: unknown) => {
        // Non-fatal: the stuck-import recovery cron picks up 'queued' imports
        // within 10 minutes if this invocation fails.
        console.warn(
          "retry-import: orchestrator invoke failed (cron will recover):",
          err instanceof Error ? err.message : String(err),
        );
      },
    ),
  );

  return jsonOk({ success: true, import_id, retry_count: newRetryCount });
});
