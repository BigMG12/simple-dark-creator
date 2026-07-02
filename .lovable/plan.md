## Cel
Pełna weryfikacja end-to-end workflow "Rozmowy" — od uploadu audio, przez diarization, wybór mówcy, analizę GPT, aż po wyświetlenie wyniku w nowym chess-review layout.

## Zakres weryfikacji

### 1. Warstwa danych (backend)
- Sprawdzić schema `conversations` i `conversation_analyses` na projekcie `hthjuoswarvsfssxqxxj` (wszystkie kolumny, RLS, GRANT-y)
- Sprawdzić bucket `conversations` (private, policies)
- Sprawdzić status 3 edge functions: `process-conversation`, `analyze-conversation`, `select-user-speaker` (ACTIVE + verify_jwt)
- Sprawdzić czy sekrety (`DEEPGRAM_API_KEY`, `OPENAI_API_KEY`) są dostępne w runtime funkcji

### 2. Warstwa edge functions (logika)
- `process-conversation`: czytać kod, zweryfikować że pobiera audio z bucketu, wysyła do Deepgram z diarization, zapisuje `diarization_data` i przechodzi w status `awaiting_speaker_selection`
- `select-user-speaker`: weryfikacja że filtruje transcript do `transcript_user_only` i triggeruje `analyze-conversation`
- `analyze-conversation`: weryfikacja że woła GPT z properem, zwraca strukturę zgodną z `conversation_analyses` (score, metryki, timeline, scorecard, tips)
- Sprawdzić CORS, error handling, że każdy krok update-uje `status` (pending → processing → awaiting_speaker_selection → analyzing → completed/failed)

### 3. Warstwa frontendu
- `ConversationsNew.tsx`: przejść 5 kroków (Source → Upload → Type → Context → Diarization) i zweryfikować że każdy krok wywołuje poprawny endpoint
- `useConversationResults.ts`: polling co N sekund, poprawne odczytywanie statusu
- `ConversationDetail.tsx`: renderowanie stanów (pending, awaiting_speaker_selection, analyzing, completed, failed)

### 4. Test end-to-end (Playwright)
- Zalogować się do preview (sesja injectowana przez sandbox)
- Uploadować krótki testowy plik audio (wygenerować lokalnie ~5s ciszy+tonu przez ffmpeg)
- Przejść flow: wybór typu → kontekst → wysłać
- Odpytywać DB w tle aż `status = 'completed'` (timeout 3 min)
- Otworzyć `ConversationDetail` i zrobić screenshot chess-review layout
- Zweryfikować że wszystkie sekcje są wypełnione (score, timeline, transcript, scorecard, tips)

### 5. Raport
Dla każdej z 4 warstw: ✅ / ⚠️ / ❌ z konkretną listą znalezisk i propozycją fixa. Jeśli coś się wysypie w Playwright, dołączę screenshot + log z `edge_function_logs`.

## Deliverable
Jedna wiadomość zwrotna z tabelą wyników + lista bugów posortowana po priorytecie. Bez zmian w kodzie — tylko diagnoza. Fix idzie osobnym promptem po Twojej akceptacji.
