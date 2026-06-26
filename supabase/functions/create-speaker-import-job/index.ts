/**
 * create-speaker-import-job
 * HTTP POST — called from the frontend when a user submits a speaker import.
 *
 * Flow:
 *   1. Verify JWT
 *   2. Check quota via check_import_quota() — tier-aware (free: 5/mo, pro: 50/mo)
 *   3. Validate URL for the given source_type
 *   4. Insert channel_imports row (status = 'queued')
 *   5. Atomically increment user quota counter via increment_import_quota()
 *   6. Trigger run-import-orchestrator (fire-and-forget)
 *   7. Return { import_id, estimated_completion_minutes }
 */

import {
  CORS_HEADERS,
  createAdminClient,
  createUserClient,
  invokeFunction,
  JSON_HEADERS,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

import type {
  CategoryId,
  ChannelImport,
  CreateImportJobRequest,
  SourceType,
} from "../_shared/import-types.ts";

import {
  estimateCompletionMinutes,
  URL_PATTERNS,
} from "../_shared/import-types.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_NUM_VIDEOS: Record<SourceType, number> = {
  youtube_channel: 20,
  youtube_video: 1,
  rumble: 5,
  spotify: 10,
  upload: 1,
};

// ---------------------------------------------------------------------------
// check_import_quota response shape (matches 008_quota_tier_helpers.sql)
// ---------------------------------------------------------------------------

interface QuotaAllowed {
  allowed: true;
  remaining_imports: number;
  video_limit: number;
  tier: "free" | "pro";
}

interface QuotaDenied {
  allowed: false;
  reason: "monthly_limit_exceeded" | "video_count_exceeded";
  limit: number;
  used?: number;
  requested?: number;
  reset_at?: string;
}

type QuotaResult = QuotaAllowed | QuotaDenied;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Missing Authorization header", 401);

  const userClient = createUserClient(authHeader);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return jsonError("Unauthorized", 401);

  const userId = user.id;
  const admin = createAdminClient();

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: CreateImportJobRequest;
  try {
    body = await req.json() as CreateImportJobRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const {
    source_type,
    source_url,
    num_videos,
    target_category_id,
    custom_name,
    custom_trait,
  } = body;

  if (!source_type || !source_url) {
    return jsonError("source_type and source_url are required", 400);
  }

  const validSourceTypes: SourceType[] = [
    "youtube_channel",
    "youtube_video",
    "rumble",
    "spotify",
    "upload",
  ];
  if (!validSourceTypes.includes(source_type)) {
    return jsonError(
      `Invalid source_type. Must be one of: ${validSourceTypes.join(", ")}`,
      400,
    );
  }

  // ── URL validation ────────────────────────────────────────────────────────
  const pattern = URL_PATTERNS[source_type];
  if (pattern && !pattern.test(source_url)) {
    return jsonError(
      `Invalid URL for source_type "${source_type}". ${urlHint(source_type)}`,
      400,
    );
  }

  // ── Category validation ───────────────────────────────────────────────────
  if (target_category_id) {
    const validCategories: CategoryId[] = [
      "motivation",
      "sales",
      "influence",
      "leadership",
      "storytelling",
      "authority",
    ];
    if (!validCategories.includes(target_category_id)) {
      return jsonError("Invalid target_category_id", 400);
    }
  }

  const numItems = num_videos ?? DEFAULT_NUM_VIDEOS[source_type];

  // ── Tier-aware quota check ────────────────────────────────────────────────
  // check_import_quota() auto-creates the quota row for first-time users.
  // Returns structured JSONB so we can surface clear error messages.
  const { data: quotaResult, error: quotaErr } = await admin.rpc(
    "check_import_quota",
    { p_user_id: userId, p_video_count: numItems },
  );

  if (quotaErr) {
    console.error("Quota check failed:", quotaErr.message);
    return jsonError("Could not verify import quota", 500);
  }

  const quota = quotaResult as QuotaResult;

  if (!quota.allowed) {
    const denied = quota as QuotaDenied;
    if (denied.reason === "monthly_limit_exceeded") {
      return new Response(
        JSON.stringify({
          error: `Monthly import limit reached (${denied.limit} imports/month). ` +
            `Quota resets on ${new Date(denied.reset_at ?? "").toLocaleDateString()}. ` +
            `Upgrade to Pro for 50 imports/month.`,
          reason: denied.reason,
          quota_used: denied.used,
          quota_limit: denied.limit,
          reset_at: denied.reset_at,
        }),
        { status: 403, headers: JSON_HEADERS },
      );
    }

    if (denied.reason === "video_count_exceeded") {
      return new Response(
        JSON.stringify({
          error: `Requested ${denied.requested} videos exceeds your plan's limit of ${denied.limit} per import. ` +
            `Reduce num_videos or upgrade to Pro.`,
          reason: denied.reason,
          requested: denied.requested,
          limit: denied.limit,
        }),
        { status: 403, headers: JSON_HEADERS },
      );
    }

    return jsonError("Import quota check failed", 403);
  }

  // ── Insert channel_imports row ────────────────────────────────────────────
  const { data: importRow, error: insertErr } = await admin
    .from("channel_imports")
    .insert({
      user_id: userId,
      source_type,
      source_url: source_url.trim(),
      status: "queued",
      custom_name: custom_name ?? null,
      custom_trait: custom_trait ?? null,
      target_category_id: target_category_id ?? null,
    })
    .select()
    .single<ChannelImport>();

  if (insertErr || !importRow) {
    console.error("Failed to insert channel_imports:", insertErr?.message);
    return jsonError("Failed to create import job", 500);
  }

  // ── Atomically increment quota counter ───────────────────────────────────
  // Do this after the insert so a failed insert doesn't waste quota.
  const { error: incrErr } = await admin.rpc("increment_import_quota", {
    p_user_id: userId,
  });
  if (incrErr) {
    // Non-fatal: log but continue — quota recovery happens via the monthly reset cron.
    console.warn("Failed to increment import quota:", incrErr.message);
  }

  // ── Trigger orchestrator (fire-and-forget) ────────────────────────────────
  EdgeRuntime.waitUntil(
    invokeFunction("run-import-orchestrator", {
      import_id: importRow.id,
      num_videos: numItems,
    }).catch((err: unknown) => {
      console.error(
        `[${importRow.id}] Failed to trigger orchestrator:`,
        err instanceof Error ? err.message : String(err),
      );
    }),
  );

  // ── Respond immediately ───────────────────────────────────────────────────
  return jsonOk({
    import_id: importRow.id,
    estimated_completion_minutes: estimateCompletionMinutes(
      source_type,
      numItems,
    ),
    quota: {
      remaining_imports: (quota as QuotaAllowed).remaining_imports - 1,
      video_limit: (quota as QuotaAllowed).video_limit,
      tier: (quota as QuotaAllowed).tier,
    },
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function urlHint(sourceType: SourceType): string {
  switch (sourceType) {
    case "youtube_channel":
      return "Expected: https://www.youtube.com/@handle or https://www.youtube.com/channel/UCxxx";
    case "youtube_video":
      return "Expected: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID";
    case "rumble":
      return "Expected: https://rumble.com/...";
    case "spotify":
      return "Expected: https://open.spotify.com/show/SHOW_ID";
    case "upload":
      return "For uploads, provide the Supabase Storage path returned after upload.";
  }
}
