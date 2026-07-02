## Cel
Dodać retry z wykładniczym backoffem dla (1) uploadu audio i (2) pollingu statusu rozmowy, oraz czytelne komunikaty błędu po wyczerpaniu prób.

## Zmiany

### 1. Nowy helper `src/lib/retry.ts`
- `retryWithBackoff<T>(fn, opts)` — attempts, baseMs, maxMs, factor, jitter, shouldRetry(err), onAttempt(attempt, err)
- Domyślnie: 4 próby, 500ms → 1s → 2s → 4s (cap 8s), jitter ±20%
- Rozróżnia błędy retryable (network, 5xx, 429, timeout) od terminal (4xx auth/validation)

### 2. Upload z retry — `src/pages/ConversationsNew.tsx`
- Wydzielić helper `uploadWithProgress` (już istnieje w pliku) i owinąć jego wywołanie w `retryWithBackoff`
- Reset paska postępu na starcie każdej próby
- Przy próbie > 1 pokazać "Ponawiam upload (próba X/4)…" pod paskiem postępu
- Po fail: `fileError` = "Upload nie powiódł się po 4 próbach. Sprawdź połączenie i spróbuj ponownie." + przycisk „Spróbuj ponownie" (już mamy `resetFile`, dodać wariant retry używający tego samego pliku)
- Retry również dla `createSignedUploadUrl` (osobny retry, 3 próby)

### 3. Polling z backoffem — `src/hooks/queries/useConversationResults.ts`
- Obecnie `refetchInterval: 3000` na sztywno
- Zmienić na funkcję rosnącą: 2s, 3s, 5s, 8s, 12s, 12s… (cap 12s) w zależności od `query.state.dataUpdateCount`
- Dodać `retry: 5` + `retryDelay` z wykładniczym backoffem (1s → 2s → 4s → 8s → 16s, cap 30s) na błędy sieciowe zapytania
- Po 5 nieudanych fetch pod rząd (bez żadnego udanego odpytu w ciągu 60s): przestać pollować, ustawić flagę i pokazać komunikat w `ConversationDetail.tsx`: „Nie udało się pobrać statusu rozmowy. Sprawdź połączenie i odśwież stronę."

### 4. Invoke edge functions z retry — `ConversationsNew.tsx`
- Owinąć `supabase.functions.invoke("process-conversation", …)` i `supabase.functions.invoke("select-user-speaker", …)` w `retryWithBackoff` (3 próby, retryable tylko przy błędach sieciowych / 502 / 503 / 504)
- **Nie** retry-ować gdy odpowiedź to `error` z jasnym message (np. „transcript_user_only is empty", „Cannot select speaker while conversation is …") — bo to logiczne błędy z serwera, nie transient
- Przy retry aktualizować `processingLabel` na „Ponawiam… (próba X/3)"

### 5. Timeout guard
- Dodać w `ConversationDetail.tsx` timer 5 min dla statusów `pending/diarizing/analyzing`. Po timeoucie: banner „Analiza trwa dłużej niż zwykle. Coś mogło się zaciąć — [Ponów] lub [Kontakt]."
- `awaiting_speaker_selection` bez timeoutu (czeka na usera)

## Zakres (pliki)
- **nowy:** `src/lib/retry.ts`
- **edit:** `src/pages/ConversationsNew.tsx` — retry dla signed URL, uploadu, invoke
- **edit:** `src/hooks/queries/useConversationResults.ts` — polling backoff + fail flag
- **edit:** `src/pages/ConversationDetail.tsx` — banner błędu pollingu + timeout guard

## Bez zmian
- Edge functions (już mają własne timeouty i error handling)
- Schema DB / RLS
- Layout wizualny (tylko dodatkowe komunikaty tekstowe)

## Deliverable
Odporny flow: transient network hiccup podczas uploadu / pollingu = automatyczny recovery bez akcji usera. Fatal / non-retryable = jasny komunikat po polsku + przycisk retry.
