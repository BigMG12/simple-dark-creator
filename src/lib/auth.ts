import { toast } from "sonner";
import { supabase, hasSupabaseConfig } from "./supabase";

function notConfigured(): false {
  toast.error("Uwierzytelnianie nie jest skonfigurowane", {
    description:
      "Brak lub nieprawidłowy URL Supabase lub klucz anon. Dodaj prawidłowe wartości w Ustawieniach Workspace → Build Secrets.",
  });
  return false;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function friendlyMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Wystąpił nieoczekiwany błąd.";
  const msg = err.message.toLowerCase();

  if (msg.includes("user already registered") || msg.includes("already been registered"))
    return "Konto z tym adresem email już istnieje. Spróbuj się zalogować.";
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "Nieprawidłowy email lub hasło.";
  if (msg.includes("email not confirmed"))
    return "Potwierdź swój adres email przed zalogowaniem.";
  if (msg.includes("password should be"))
    return "Hasło musi mieć co najmniej 8 znaków.";
  if (msg.includes("rate limit") || msg.includes("too many requests"))
    return "Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Błąd sieci. Sprawdź połączenie internetowe i spróbuj ponownie.";

  return err.message;
}

// ── auth functions ────────────────────────────────────────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<boolean> {
  if (!hasSupabaseConfig) return notConfigured();

  // Tworzymy usera przez edge function z service_role (email_confirm: true),
  // żeby ominąć ustawienie "Confirm email" w panelu Supabase Auth.
  const { data: signupResult, error: signupError } = await supabase.functions.invoke<{
    user_id?: string;
    email?: string;
    error?: string;
  }>("signup-confirmed", {
    body: { email, password, full_name: fullName },
  });

  if (signupError || signupResult?.error) {
    const message = signupResult?.error ?? signupError?.message ?? "unknown";
    toast.error("Rejestracja nie powiodła się", {
      description: friendlyMessage(new Error(message)),
    });
    return false;
  }

  // Mail powitalny — fire-and-forget.
  supabase.functions
    .invoke("send-welcome-email", {
      body: { email, name: fullName, user_id: signupResult?.user_id },
    })
    .catch((err) => {
      console.warn("send-welcome-email invoke failed:", err);
    });

  // Auto-login — user już istnieje z potwierdzonym mailem.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    toast.error("Logowanie po rejestracji nie powiodło się", {
      description: friendlyMessage(signInError),
    });
    return false;
  }

  toast.success("Konto utworzone!", { description: "Witamy w Big Speaking 🔥" });
  return true;
}

export async function signInWithEmail(email: string, password: string): Promise<boolean> {
  if (!hasSupabaseConfig) return notConfigured();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    toast.error("Logowanie nie powiodło się", { description: friendlyMessage(error) });
    return false;
  }

  toast.success("Witaj ponownie!");
  return true;
}

export async function signInWithGoogle(): Promise<boolean> {
  if (!hasSupabaseConfig) return notConfigured();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    toast.error("Logowanie przez Google nie powiodło się", { description: friendlyMessage(error) });
    return false;
  }

  return true;
}

export async function signOut(): Promise<void> {
  if (!hasSupabaseConfig) {
    notConfigured();
    return;
  }
  const { error } = await supabase.auth.signOut();

  if (error) {
    toast.error("Wylogowanie nie powiodło się", { description: friendlyMessage(error) });
    return;
  }

  toast.success("Wylogowano pomyślnie.");
}

export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  if (!hasSupabaseConfig) return notConfigured();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth?mode=reset`,
  });

  if (error) {
    toast.error("Nie udało się wysłać emaila resetującego", { description: friendlyMessage(error) });
    return false;
  }

  toast.success("Link resetujący wysłany!", {
    description: "Sprawdź swoją skrzynkę w poszukiwaniu linku do resetowania hasła.",
  });
  return true;
}

export async function updatePassword(newPassword: string): Promise<boolean> {
  if (!hasSupabaseConfig) return notConfigured();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    toast.error("Aktualizacja hasła nie powiodła się", { description: friendlyMessage(error) });
    return false;
  }

  toast.success("Hasło zaktualizowane pomyślnie.");
  return true;
}
