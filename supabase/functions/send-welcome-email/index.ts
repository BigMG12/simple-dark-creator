/**
 * send-welcome-email
 * Wysyła powitalnego maila po rejestracji nowego użytkownika.
 *
 * Wywoływane z klienta (po udanym signUp) poprzez supabase.functions.invoke().
 * Wymagany sekret: RESEND_API_KEY.
 */

import { CORS_HEADERS, jsonError, jsonOk } from "../_shared/supabase-admin.ts";

interface Payload {
  email: string;
  name?: string;
  user_id?: string;
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

  const { email, name, user_id } = payload;
  if (!email || typeof email !== "string") {
    return jsonError("email is required", 400);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("send-welcome-email: RESEND_API_KEY missing, skipping");
    return jsonOk({ skipped: true, reason: "no_resend_key" });
  }

  const displayName = name?.trim() || email.split("@")[0];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BIG SPEAKING <noreply@bigspeaking.ai>",
        to: [email],
        headers: user_id ? { "X-Entity-Ref-ID": `welcome-${user_id}` } : undefined,
        subject: "Witaj w Big Speaking! 🔥",
        html: buildHtml(displayName),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(`send-welcome-email: Resend ${res.status}:`, body);
      return jsonOk({ sent: false, error: `resend_${res.status}` });
    }

    return jsonOk({ sent: true });
  } catch (err) {
    console.warn(
      "send-welcome-email: send threw:",
      err instanceof Error ? err.message : String(err),
    );
    return jsonOk({ sent: false, error: "send_exception" });
  }
});

function buildHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Witaj w Big Speaking</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#1a1a2e;border-radius:16px;overflow:hidden;max-width:560px;">
          <tr>
            <td style="background:linear-gradient(135deg,#ff5a1f,#ffb347);padding:36px 40px;">
              <p style="margin:0;color:#fff;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">
                BIG SPEAKING
              </p>
              <h1 style="margin:8px 0 0;color:#fff;font-size:30px;font-weight:700;line-height:1.2;">
                Gratulacje, ${escapeHtml(name)}! 🔥
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#c4c4d4;font-size:16px;line-height:1.6;">
                Świetnie, że dołączasz do <strong style="color:#fff;">Big Speaking</strong>!
                Twoje konto jest gotowe — czas zacząć trenować swoje wystąpienia.
              </p>
              <p style="margin:0 0 28px;color:#c4c4d4;font-size:16px;line-height:1.6;">
                Nagraj pierwszą krótką wypowiedź, a my pokażemy Ci konkretne wskazówki,
                co poprawić, żeby mówić mocniej i pewniej.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#ff5a1f,#ffb347);">
                    <a href="https://app.bigspeaking.ai/welcome"
                       style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;
                              font-weight:600;text-decoration:none;border-radius:10px;">
                      Rozpocznij →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#7070a0;font-size:13px;line-height:1.5;">
                Powodzenia — trzymamy kciuki za Twoje pierwsze nagranie.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2a40;">
              <p style="margin:0;color:#5a5a80;font-size:12px;">
                Otrzymujesz tę wiadomość, ponieważ właśnie założono konto w Big Speaking.
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
