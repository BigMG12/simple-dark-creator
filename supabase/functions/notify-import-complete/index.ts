/**
 * notify-import-complete
 * Internal function — called by the DB trigger on_import_complete (migration 009)
 * via pg_net when channel_imports.status transitions to 'complete'.
 *
 * Actions (all non-blocking — failures are logged but never surface to caller):
 *   1. Verify the import is genuinely 'complete' (trigger fires on every UPDATE)
 *   2. Load user profile to resolve email + notification preference
 *   3. Load resulting speaker name for the email subject / body
 *   4. Send completion email via Resend (only if email_notifications_enabled = true)
 *   5. Append a 'speaker_imported' row to achievements_log for the profile timeline
 *
 * IMPORTANT: This function is called with the service_role key by pg_net (fire-and-forget).
 * It is NOT exposed to the browser. Do not add CORS or user-auth checks.
 *
 * Design for idempotency: pg_net may deliver the same call more than once.
 * achievements_log is append-only so duplicate rows are acceptable for debugging.
 * The email is sent only once because Resend deduplicates on idempotency-key.
 *
 * Required secret (Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY — Resend API key; if absent, email step is skipped silently.
 *
 * Required migration: 011_notify_complete_extras.sql
 *   • profiles.email_notifications_enabled column
 *   • achievements_log.event_type allows 'speaker_imported'
 */

import {
  CORS_HEADERS,
  createAdminClient,
  jsonError,
  jsonOk,
} from "../_shared/supabase-admin.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotifyPayload {
  import_id: string;
  user_id: string;
}

interface ImportRow {
  id: string;
  status: string;
  source_type: string;
  resulting_speaker_id: string | null;
  completed_at: string | null;
}

interface ProfileRow {
  email: string | null;
  full_name: string | null;
  email_notifications_enabled: boolean;
}

interface SpeakerRow {
  name: string;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: NotifyPayload;
  try {
    payload = await req.json() as NotifyPayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { import_id, user_id } = payload;
  if (!import_id || !user_id) {
    return jsonError("import_id and user_id are required", 400);
  }

  const admin = createAdminClient();

  // ── Load import row ───────────────────────────────────────────────────────
  const { data: importRow } = await admin
    .from("channel_imports")
    .select("id, status, source_type, resulting_speaker_id, completed_at")
    .eq("id", import_id)
    .maybeSingle<ImportRow>();

  // Guard: trigger fires on every UPDATE, not just status → 'complete'.
  if (!importRow || importRow.status !== "complete") {
    return jsonOk({ skipped: true, reason: "not_complete" });
  }

  // ── Load user profile ─────────────────────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, email_notifications_enabled")
    .eq("id", user_id)
    .maybeSingle<ProfileRow>();

  // ── Resolve speaker name for notification content ─────────────────────────
  let speakerName = "Your new speaker";
  if (importRow.resulting_speaker_id) {
    const { data: speaker } = await admin
      .from("speakers")
      .select("name")
      .eq("id", importRow.resulting_speaker_id)
      .maybeSingle<SpeakerRow>();
    if (speaker?.name) speakerName = speaker.name;
  }

  const results: Record<string, unknown> = {
    import_id,
    speaker_id: importRow.resulting_speaker_id,
    speaker_name: speakerName,
  };

  // ── Email notification ────────────────────────────────────────────────────
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (resendKey && profile?.email && profile.email_notifications_enabled) {
    results.email_attempted = true;
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "BIG SPEAKING <noreply@bigspeaking.ai>",
          to: [profile.email],
          // Resend idempotency: same import_id → only delivered once even on retries.
          headers: { "X-Entity-Ref-ID": import_id },
          subject: `${speakerName} is ready to coach you!`,
          html: buildEmailHtml(
            profile.full_name ?? "there",
            speakerName,
            importRow.resulting_speaker_id,
          ),
        }),
      });

      if (emailRes.ok) {
        results.email_sent = true;
      } else {
        const body = await emailRes.text();
        console.warn(
          `[${import_id}] notify-import-complete: Resend returned ${emailRes.status}:`,
          body,
        );
        results.email_error = `Resend ${emailRes.status}`;
      }
    } catch (err) {
      // Never let email failure surface to the DB trigger.
      console.warn(
        `[${import_id}] notify-import-complete: email send threw:`,
        err instanceof Error ? err.message : String(err),
      );
      results.email_error = "send_exception";
    }
  } else {
    results.email_skipped = true;
    if (!resendKey) results.email_skip_reason = "no_resend_key";
    else if (!profile?.email) results.email_skip_reason = "no_user_email";
    else results.email_skip_reason = "notifications_disabled";
  }

  // ── achievements_log entry ────────────────────────────────────────────────
  // Gives the profile timeline a 'speaker_imported' milestone card.
  // Requires migration 011: achievements_log.event_type allows 'speaker_imported'.
  try {
    await admin.from("achievements_log").insert({
      user_id,
      event_type: "speaker_imported",
      event_payload: {
        import_id,
        speaker_id: importRow.resulting_speaker_id,
        speaker_name: speakerName,
        source_type: importRow.source_type,
        completed_at: importRow.completed_at,
      },
    });
    results.achievement_logged = true;
  } catch (err) {
    // Non-fatal: the import completed successfully; timeline entry is cosmetic.
    console.warn(
      `[${import_id}] notify-import-complete: achievements_log insert failed:`,
      err instanceof Error ? err.message : String(err),
    );
    results.achievement_error = "insert_failed";
  }

  console.log(`[${import_id}] notify-import-complete:`, JSON.stringify(results));

  return jsonOk(results);
});

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

function buildEmailHtml(
  userName: string,
  speakerName: string,
  speakerId: string | null,
): string {
  const speakerUrl = speakerId
    ? `https://app.bigspeaking.ai/speakers/${speakerId}`
    : "https://app.bigspeaking.ai/speakers";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${speakerName} is ready</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#1a1a2e;border-radius:16px;overflow:hidden;max-width:560px;">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:32px 40px;">
              <p style="margin:0;color:#fff;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">
                BIG SPEAKING
              </p>
              <h1 style="margin:8px 0 0;color:#fff;font-size:28px;font-weight:700;line-height:1.2;">
                Your speaker is ready!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#c4c4d4;font-size:16px;line-height:1.6;">
                Hi ${userName},
              </p>
              <p style="margin:0 0 24px;color:#c4c4d4;font-size:16px;line-height:1.6;">
                <strong style="color:#fff;">${speakerName}</strong> has been successfully
                analyzed and added to your coaching lineup. Their speaking style, signature
                phrases and persuasion patterns are ready for you to practice with.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#6c63ff,#a78bfa);">
                    <a href="${speakerUrl}"
                       style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;
                              font-weight:600;text-decoration:none;border-radius:10px;">
                      Start practicing →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#7070a0;font-size:13px;line-height:1.5;">
                Tip: Record yourself speaking on the same topics as ${speakerName}
                to get a side-by-side style comparison.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2a40;">
              <p style="margin:0;color:#5050708;font-size:12px;">
                You received this email because you have import notifications enabled.
                <a href="https://app.bigspeaking.ai/settings"
                   style="color:#6c63ff;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
