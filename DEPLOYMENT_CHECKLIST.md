# DEPLOYMENT CHECKLIST — BIG SPEAKING BACKEND

## STAN OBECNY (2026-04-24 16:14)

### ✅ CO DZIAŁA:
- Kod edge functions istnieje (780 linii analyze-recording)
- Supabase CLI zainstalowane (v2.78.1)
- Projekt połączony: hthjuoswarvsfssxqxxj
- Migracje SQL w folderze supabase/migrations/

### ❌ CO NIE DZIAŁA:
- **ZERO edge functions wdrożonych** (supabase functions list = puste)
- analyze-recording zwraca 404 NOT_FOUND
- Brak deno.json w folderach funkcji
- Nieznany stan secrets (OPENAI_API_KEY, etc.)

## KROKI DO WDROŻENIA

### 1. Sprawdź secrets (KRYTYCZNE)
```bash
supabase secrets list --project-ref hthjuoswarvsfssxqxxj
```

Wymagane:
- OPENAI_API_KEY
- SUPABASE_URL (auto)
- SUPABASE_SERVICE_ROLE_KEY (auto)
- SUPABASE_ANON_KEY (auto)

Jeśli brakuje OPENAI_API_KEY:
```bash
supabase secrets set OPENAI_API_KEY=sk-... --project-ref hthjuoswarvsfssxqxxj
```

### 2. Wdróż funkcje (CORE)
```bash
# Najpierw CORE function
supabase functions deploy analyze-recording --project-ref hthjuoswarvsfssxqxxj

# Potem pozostałe (jeśli potrzebne)
supabase functions deploy create-speaker-import-job --project-ref hthjuoswarvsfssxqxxj
supabase functions deploy cancel-import --project-ref hthjuoswarvsfssxqxxj
```

### 3. Weryfikacja
```bash
# Lista wdrożonych funkcji
supabase functions list --project-ref hthjuoswarvsfssxqxxj

# Test analyze-recording (bez auth = 401, ale nie 404)
curl -X POST "https://hthjuoswarvsfssxqxxj.supabase.co/functions/v1/analyze-recording" \
  -H "Content-Type: application/json" \
  -d '{"recording_id":"test"}'
```

Oczekiwany wynik: `{"error":"Missing Authorization header"}` (401)
NIE: `{"code":"NOT_FOUND"}` (404)

### 4. Sprawdź migracje SQL
```bash
# Czy wszystkie migracje są zastosowane?
# Zaloguj się do Supabase Dashboard → SQL Editor
# Uruchom check_backend.sql
```

### 5. Test end-to-end (po wdrożeniu)
1. Zaloguj się do aplikacji
2. Nagraj 10s audio
3. Sprawdź logi: `supabase functions logs analyze-recording --project-ref hthjuoswarvsfssxqxxj`
4. Sprawdź czy analysis się pojawił w DB

## TYPOWE PROBLEMY

### Problem: "Missing OPENAI_API_KEY"
```bash
supabase secrets set OPENAI_API_KEY=sk-... --project-ref hthjuoswarvsfssxqxxj
```

### Problem: "Import not found" w edge function
- Sprawdź czy _shared/ folder jest w tym samym katalogu co functions/
- Deno używa relative imports: `../shared/file.ts`

### Problem: Timeout (>60s)
- Whisper API może być wolne dla długich nagrań
- Rozważ skrócenie max duration do 2 min
- Lub użyj EdgeRuntime.waitUntil (już jest w kodzie)

### Problem: RLS blokuje zapis
- Service role key POWINIEN omijać RLS
- Sprawdź czy używasz `admin` client (service_role), nie `userClient`

## NASTĘPNE KROKI PO WDROŻENIU

1. Monitoruj logi przez pierwsze 24h
2. Sprawdź czy XP się przyznaje
3. Sprawdź czy realtime subscription działa
4. Zoptymalizuj jeśli Whisper jest wolne

---
**Status**: GOTOWE DO WDROŻENIA
**Blokery**: Brak OPENAI_API_KEY (do weryfikacji)
