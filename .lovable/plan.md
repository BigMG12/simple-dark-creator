## Cel
1. Filtr trudności w `/drills` z wieloma gwiazdkami zaznaczalnymi naraz (jak na screenie + przycisk "Wyczyść").
2. Naprawa nawigacji: po wejściu w drill → nagrywanie i cofnięciu, użytkownik wraca do widoku ćwiczenia (a nie ląduje znowu w trybie nagrywania).

## Zmiany

### 1. `src/pages/Drills.tsx` — multi-select trudności
- `difficulty` zmienia typ z `number | null` na `Set<number>` (lub `number[]`).
- Klik w gwiazdkę przełącza obecność wartości w secie (toggle).
- Filtr przepuszcza drill, gdy `difficulty.size === 0` lub `difficulty.has(d.difficulty)`.
- Przycisk "Wyczyść" pojawia się gdy `size > 0` i resetuje set.
- Wizualnie zachowany obecny styl pigułki (czarne tło, złota gwiazdka aktywna) — pasuje do screena. Każda kliknięta gwiazdka pozostaje wyróżniona niezależnie.

### 2. Naprawa nawigacji drill → nagrywanie
Problem: `DrillDetail` nawiguje do `/record?drillId=X` (push), a `Record.tsx` `replace`uje to na `/record/prep`. Po cofnięciu z prep użytkownik ląduje na `/drills/:id` poprawnie — ale po wyjściu z `RecordLive` (przycisk Exit → `navigate("/record")`) i kolejnym cofnięciu/forward sesja `recordingSession` zostaje, więc kolejne wejścia automatycznie wpadają w prep.

Rozwiązanie:
- W `DrillDetail.tsx` zamiast `navigate('/record?drillId=...')` ustawić `recordingSession` lokalnie (jak robi `Record.tsx` w useEffect z drillId) i przejść bezpośrednio do `/record/prep` zwykłym pushem. Eliminuje pośredni wpis `/record?drillId` w historii.
- W `RecordPrep.tsx` i `RecordLive.tsx` przycisk wyjścia / X nawiguje warunkowo: jeśli `session.source === "drill"` (nowe pole) → `navigate('/drills/'+session.drillId)`, w przeciwnym razie `/record`. Użycie `replace: true` przy wyjściu, żeby nie zostawiać śmieci w historii.
- Po wyjściu z nagrywania (Exit) wyczyścić `recordingSession`, żeby kolejne wejście w `/record/prep` bez świeżych danych pokazało redirect do `/record` (już istniejący guard).

### 3. Typ `recordingSession`
Dodać opcjonalne pola: `source?: "drill" | "arena" | "challenge"`, `drillId?: string` — używane do decyzji o powrocie.

## Out of scope
- Brak zmian w logice nagrywania, uploadzie, edge functions.
- Brak zmian wizualnych poza filtrem trudności.