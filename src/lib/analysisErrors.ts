export type AnalysisErrorCode =
  | "INVOKE_NETWORK"
  | "INVOKE_AUTH"
  | "INVOKE_NOT_FOUND"
  | "INVOKE_FORBIDDEN"
  | "INVOKE_SERVER"
  | "BACKEND_FAILED"
  | "STALE_BACKEND_BUNDLE"
  | "STARTUP_TIMEOUT"
  | "ANALYSIS_TIMEOUT"
  | "MISSING_RECORDING"
  | "SCHEMA_MISMATCH"
  | "UNKNOWN";

export interface AnalysisErrorInfo {
  code: AnalysisErrorCode;
  title: string;
  reason: string;
  suggestion: string;
  rawMessage?: string;
  recordingId?: string;
}

interface InvokeLikeError {
  message?: string;
  name?: string;
  status?: number;
  context?: { status?: number; statusText?: string };
}

export function classifyInvokeError(
  err: unknown,
  recordingId?: string,
): AnalysisErrorInfo {
  const e = (err ?? {}) as InvokeLikeError;
  const raw = e.message ?? String(err ?? "");
  const status = e.status ?? e.context?.status;
  const lower = raw.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("failed to send a request") ||
    e.name === "FunctionsFetchError"
  ) {
    return {
      code: "INVOKE_NETWORK",
      title: "Nie udało się połączyć z analizą",
      reason:
        "Przeglądarka nie mogła wysłać żądania do funkcji analizującej (sieć lub CORS).",
      suggestion:
        "Sprawdź połączenie z internetem i odśwież stronę. Jeśli problem wraca, funkcja edge może wymagać redeploy.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (status === 401) {
    return {
      code: "INVOKE_AUTH",
      title: "Sesja wygasła",
      reason: "Twoja sesja użytkownika nie została zaakceptowana przez serwer.",
      suggestion: "Wyloguj się i zaloguj ponownie, a potem spróbuj jeszcze raz.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (status === 403) {
    return {
      code: "INVOKE_FORBIDDEN",
      title: "Brak dostępu do nagrania",
      reason: "To nagranie nie należy do twojego konta.",
      suggestion: "Wróć do nagrywania i utwórz nową sesję.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (status === 404) {
    return {
      code: "INVOKE_NOT_FOUND",
      title: "Funkcja analizy niedostępna",
      reason:
        "Endpoint analyze-recording nie został znaleziony na backendzie.",
      suggestion:
        "Funkcja edge prawdopodobnie nie jest wdrożona. Wdróż ją ponownie z poziomu Lovable Cloud.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      code: "INVOKE_SERVER",
      title: "Błąd serwera analizy",
      reason: `Funkcja analyze-recording zwróciła błąd ${status}.`,
      suggestion:
        "Sprawdź klucz OPENAI_API_KEY i logi funkcji edge, a następnie spróbuj ponownie.",
      rawMessage: raw,
      recordingId,
    };
  }

  return {
    code: "UNKNOWN",
    title: "Analiza nie powiodła się",
    reason: raw || "Nieznany błąd po stronie funkcji analizującej.",
    suggestion: "Spróbuj ponownie. Jeśli problem się powtarza, skontaktuj się z pomocą.",
    rawMessage: raw,
    recordingId,
  };
}

export function backendFailureInfo(
  errorMessage: string | null | undefined,
  recordingId?: string,
): AnalysisErrorInfo {
  const raw = (errorMessage ?? "").trim();
  const lower = raw.toLowerCase();

  // Stary bundle w chmurze: każdy błąd "Cannot read properties of undefined"
  // (one_sentence_essence, wpm_typical, ...) — to ten sam objaw, ten sam fix.
  if (
    lower.includes("one_sentence_essence") ||
    lower.includes("wpm_typical") ||
    lower.includes("cannot read properties of undefined")
  ) {
    return staleBackendBundleInfo("old-runtime-error", recordingId, raw);
  }

  if (lower.includes("openai") || lower.includes("whisper")) {
    return {
      code: "BACKEND_FAILED",
      title: "Analiza AI nie powiodła się",
      reason: raw,
      suggestion:
        "Najczęstsza przyczyna: brakujące lub nieprawidłowe credity OpenAI. Sprawdź klucz OPENAI_API_KEY.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (lower.includes("too short") || lower.includes("silent")) {
    return {
      code: "BACKEND_FAILED",
      title: "Nagranie za krótkie",
      reason: raw,
      suggestion: "Nagraj ponownie i mów co najmniej 5 sekund.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (lower.includes("speaker")) {
    return {
      code: "BACKEND_FAILED",
      title: "Brak skonfigurowanego mentora",
      reason: raw,
      suggestion: "Wybierz mentora w ustawieniach profilu i spróbuj ponownie.",
      rawMessage: raw,
      recordingId,
    };
  }

  if (lower.includes("insert") || lower.includes("column")) {
    return {
      code: "BACKEND_FAILED",
      title: "Błąd zapisu wyniku analizy",
      reason: raw,
      suggestion:
        "Schemat bazy nie pasuje do funkcji edge. Wdróż najnowszą wersję analyze-recording.",
      rawMessage: raw,
      recordingId,
    };
  }

  return {
    code: "BACKEND_FAILED",
    title: "Analiza nie powiodła się",
    reason: raw || "Backend zgłosił błąd bez szczegółów.",
    suggestion: "Spróbuj ponownie. Jeśli problem wraca, sprawdź logi funkcji edge.",
    rawMessage: raw,
    recordingId,
  };
}

export const EXPECTED_RUNTIME_SENTINEL = "P3X8N4";

export function staleBackendBundleInfo(
  runtimeVersion?: string,
  recordingId?: string,
  rawMessage?: string,
): AnalysisErrorInfo {
  const version = runtimeVersion?.trim() || "stary bundle (brak runtime_version)";
  return {
    code: "STALE_BACKEND_BUNDLE",
    title: "Backend uruchamia starą wersję analizy",
    reason:
      `Funkcja analyze-recording w chmurze wykonuje stary bundle (${version}). Naprawiony kod r11 (sentinel ${EXPECTED_RUNTIME_SENTINEL}) jest w repo, ale pipeline deploy go nie odświeżył — stąd błędy typu "Cannot read properties of undefined (reading 'one_sentence_essence' / 'wpm_typical' / ...)".`,
    suggestion:
      "WORKAROUND (działa NATYCHMIAST, bez deploy): otwórz Supabase Dashboard → SQL Editor i uruchom skrypt APPLY_PERSONA_V1_SHIM_v2.sql z głównego katalogu repo. Naprawia dane w bazie tak, że stary bundle ma kompletny kształt persona_profile (identity + voice_signature + language + rhetoric + energy + teaching) i przestaje wybuchać. Po wykonaniu skryptu spróbuj nagrać ponownie.",
    rawMessage: rawMessage ?? version,
    recordingId,
  };
}

export function startupTimeoutInfo(recordingId?: string): AnalysisErrorInfo {
  return {
    code: "STARTUP_TIMEOUT",
    title: "Analiza nie wystartowała",
    reason:
      "Nagranie zostało zapisane, ale funkcja analizująca nie podjęła pracy w oczekiwanym czasie.",
    suggestion:
      "Spróbuj ponownie. Jeśli problem wraca, sprawdź czy funkcja analyze-recording jest wdrożona i czy ustawiony jest OPENAI_API_KEY.",
    recordingId,
  };
}

export function analysisTimeoutInfo(recordingId?: string): AnalysisErrorInfo {
  return {
    code: "ANALYSIS_TIMEOUT",
    title: "Analiza trwa zbyt długo",
    reason: "Backend rozpoczął pracę, ale nie zakończył jej w 3 minuty.",
    suggestion:
      "Spróbuj ponownie z krótszym nagraniem. Jeśli problem wraca, skontaktuj się z pomocą.",
    recordingId,
  };
}

export function missingRecordingInfo(): AnalysisErrorInfo {
  return {
    code: "MISSING_RECORDING",
    title: "Nie znaleziono nagrania",
    reason: "Sesja nagrywania wygasła zanim analiza mogła się rozpocząć.",
    suggestion: "Wróć do ekranu nagrywania i nagraj jeszcze raz.",
  };
}

export function schemaMismatchInfo(
  missingColumn: string,
  recordingId?: string,
): AnalysisErrorInfo {
  return {
    code: "SCHEMA_MISMATCH",
    title: "Schemat bazy danych jest nieaktualny",
    reason: `W tabeli brakuje kolumny "${missingColumn}". Funkcja analyze-recording oczekuje pól, których Twoja baza nie posiada — dlatego edge function umiera w trakcie wykonania, a przeglądarka widzi to jako "Failed to send a request".`,
    suggestion:
      'Otwórz Supabase Dashboard → SQL Editor i uruchom skrypt z pliku APPLY_TO_SUPABASE.sql (dostępny w /mnt/documents/). Skrypt dodaje brakujące kolumny: recordings.error_message, analyses.style_match_score i pokrewne. Po wykonaniu spróbuj nagrać ponownie.',
    rawMessage: `Postgres 42703: column "${missingColumn}" does not exist`,
    recordingId,
  };
}

/**
 * Detect Postgres "column does not exist" errors (code 42703) from a
 * PostgREST error payload. Returns the column name if matched, else null.
 */
export function detectMissingColumn(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { code?: string; message?: string };
  if (e.code !== "42703") return null;
  const match = e.message?.match(/column\s+(?:\S+\.)?(\S+?)\s+does not exist/i);
  return match?.[1] ?? "unknown";
}

/**
 * True when the error is a Postgres schema error (missing column / table)
 * that retrying will never fix. Use to disable react-query retries and
 * polling intervals on broken hooks until the migration is applied.
 */
export function isSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  // 42703 = undefined_column, 42P01 = undefined_table
  if (e.code === "42703" || e.code === "42P01") return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("does not exist") && msg.includes("column");
}