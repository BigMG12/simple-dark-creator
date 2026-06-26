/**
 * cancel-import
 * HTTP POST — called from the frontend to cancel an in-progress import.
 *
 * Flow:
 *   1. Verify JWT — only the import owner may cancel
 *   2. Load channel_imports row — must be in a cancellable state
 *   3. Set channel_imports.status = 'cancelled'
 *   4. Set all pending / in_progress transcript_jobs to 'skipped'
 *   5. Write a 'cancelled' row to import_events
 *   6. Return { success: true, import_id }
 *
 * Cancellable states: queued, fetching_metadata, fetching_transcripts,
 *   transcribing_audio, analyzing_style, generating_persona, embedding.
 * Non-cancellable: complete, failed, cancelled (already terminal).
 */

import {
  CORS_HEADERS,
  createAdminClient,
  createUserClient,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

const CANCELLABLE_STATUSES = [
  "queued",
  "fetching_metadata",
  "fetching_transcripts",
  "transcribing_audio",
  "analyzing_style",
  "generating_persona",
  "embedding",
] as const;

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
    .select("id, user_id, status")
    .eq("id", import_id)
    .maybeSingle<{ id: string; user_id: string; status: string }>();

  if (fetchError) {
    console.error("cancel-import: fetch error", fetchError);
    return jsonError("Failed to fetch import", 500);
  }

  if (!importRow) return jsonError("Import not found", 404);

  // ── Ownership check ───────────────────────────────────────────────────────
  if (importRow.user_id !== user.id) return jsonError("Forbidden", 403);

  // ── Status check ──────────────────────────────────────────────────────────
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(importRow.status)) {
    return jsonError(
      `Import cannot be cancelled (current status: ${importRow.status})`,
      400,
    );
  }

  // ── Cancel the import ─────────────────────────────────────────────────────
  const { error: cancelErr } = await admin
    .from("channel_imports")
    .update({
      status: "cancelled",
      error_message: "Cancelled by user",
    })
    .eq("id", import_id);

  if (cancelErr) {
    console.error("cancel-import: update error", cancelErr);
    return jsonError("Failed to cancel import", 500);
  }

  // ── Skip any pending transcript_jobs ──────────────────────────────────────
  // Prevents in-progress runs (if process-transcripts is currently executing)
  // from picking up more jobs after the cancel is committed.
  await admin
    .from("transcript_jobs")
    .update({ status: "skipped" })
    .eq("import_id", import_id)
    .in("status", ["pending", "in_progress"]);

  // ── Audit log ─────────────────────────────────────────────────────────────
  await admin.from("import_events").insert({
    import_id,
    event_type: "cancelled",
    event_data: {
      cancelled_by: user.id,
      previous_status: importRow.status,
    },
  });

  return jsonOk({ success: true, import_id });
});
