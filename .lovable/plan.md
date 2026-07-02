
# Fix: Rozmowy — ConversationDetail nie działa

## Diagnoza (potwierdzona)

Migracja `supabase/migrations/20260702151755_863b7625-08af-47dd-82f8-00ce0a8bd9d6.sql` (tworzy `conversations` + `conversation_analyses` + RLS + GRANT) **istnieje w repo, ale nie została zaaplikowana na projekcie `hthjuoswarvsfssxqxxj`** (real backend), tylko na Lovable Cloud `pxbzfbhhhrtdvkbrqqfn` (pusty).

Twardy dowód: `GET /rest/v1/conversations?select=error_message` na `hthjuoswarvsfssxqxxj` zwraca:
```
{"code":"42703","message":"column conversations.error_message does not exist"}
```

Ta sama klasa problemu co wcześniej z `.env` — Lovable operuje na jednym projekcie, kod chodzi na drugim.

## Konsekwencje w UI

- `useConversationResult` SELECT po `error_message, diarization_data, user_speaker_label, context_*` → PostgREST 400 → `result = null` → `ConversationDetail` pokazuje „Rozmowa nie znaleziona" albo utyka na spinnerze.
- `useConversationResults` (lista) też się wywala z tego samego powodu — zakładka Rozmowy pokazuje pustkę.
- `process-conversation` / `analyze-conversation` przy zapisie do nieistniejących kolumn zwracają błąd → status rozmowy nigdy nie idzie do `complete`.
- Realtime polling co 3s odpala się w kółko, ale zawsze dostaje ten sam błąd.

## Fix (3 kroki)

### 1. Zaaplikować migrację `20260702151755` na `hthjuoswarvsfssxqxxj`
Uruchomić dokładnie SQL z tej migracji w SQL Editorze projektu `hthjuoswarvsfssxqxxj`. Zawiera:
- `CREATE TABLE public.conversations` (18 kolumn: audio_url, audio_mime_type, conversation_type, status, duration_seconds, context_stakes/goal/other_party, diarization_data, transcript_full, transcript_user_only, user_speaker_label, error_message, timestamps)
- `CREATE TABLE public.conversation_analyses` (overall_score, talk_time_ratio, type_specific_metrics, timeline_events, moments_of_truth, improvement_tips, feedback_summary, scorecard, xp_awarded)
- `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` + `GRANT ALL ... TO service_role` na obu tabelach
- `ENABLE ROW LEVEL SECURITY` + polityki owner-only (`auth.uid() = user_id`)
- Indeksy (`user_id, created_at DESC`, `status WHERE ... IN (...)`)
- Trigger `set_updated_at`
- `NOTIFY pgrst, 'reload schema'` na końcu, żeby PostgREST natychmiast zobaczył nowe kolumny

Jeżeli tabele istnieją w wersji szczątkowej — najpierw `DROP TABLE IF EXISTS public.conversation_analyses, public.conversations CASCADE;` i potem odpalić migrację czysto. (Baza jest pusta — nic nie tracimy.)

### 2. Zweryfikować, że 3 edge functions są zdeployowane na `hthjuoswarvsfssxqxxj`
- `process-conversation`
- `analyze-conversation`
- `select-user-speaker`

Sprawdzę przez `supabase functions list --project-ref hthjuoswarvsfssxqxxj`. Zdeployuję te, których brakuje.

### 3. Test end‑to‑end
Realny upload krótkiego audio (≥30s) → sprawdzam każdy status w bazie (`pending → diarizing → awaiting_speaker_selection|analyzing → complete`) i logi 3 funkcji. Screenshot z ConversationDetail żeby potwierdzić że hero score, metryki, timeline i transkrypt renderują się z realnych danych.

## Sekcja techniczna

- **Nie ruszam kodu frontendu ani hooków** — `useConversationResult` jest poprawny, wywala się bo baza ma zły schema.
- **Nie ruszam `src/lib/supabase.ts`** — hardcode jest celowy z powodów opisanych w komentarzu w pliku.
- **Zabezpieczenie na przyszłość:** dodam w `AUDIT_DB_CONSISTENCY.md` notatkę, że każda migracja w repo musi być ręcznie odpalona na `hthjuoswarvsfssxqxxj`, dopóki nie odetniemy Lovable Cloud. (Docelowo powinniśmy przełączyć Lovable na ten projekt, ale to osobna decyzja.)

## Ryzyka

- Jeżeli okaże się, że jakaś rozmowa już siedzi w szczątkowej tabeli, DROP CASCADE ją usunie. Sprawdzę `SELECT count(*)` przed dropem — jeżeli 0, drop bez pytania; jeżeli >0, zapytam Cię co robić.
- Edge functions korzystają z `SUPABASE_SERVICE_ROLE_KEY` po stronie serwera; jeśli w Function Secrets tego projektu tego brakuje, dodam.

## Kryterium sukcesu

1. `GET /rest/v1/conversations?select=id,status,error_message,user_speaker_label,diarization_data` zwraca 200 (pusta tablica dla anon jest OK).
2. Upload testowy w UI: progress bar dobija do 100%, backend rozpoznaje mówców (1 lub więcej), analiza kończy się, `ConversationDetail` pokazuje wynik ze scorem i transkryptem.
3. Zero błędów `42703` w logach edge functions.
