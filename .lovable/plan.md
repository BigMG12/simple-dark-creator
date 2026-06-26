# Plan: sekcja "Zadania" na Dashboard

## Cel
Na ekranie Start (Dashboard) od razu po wejściu widać listę ZADAŃ na dziś — bez konieczności klikania w "Dzisiejsze ćwiczenie". Wszystko składane z istniejących hooków, bez nowej tabeli.

## Co powstanie

### 1. Nowy komponent `src/components/dashboard/TasksSection.tsx`
Karta "ZADANIA" wstawiona wysoko na Dashboard (zaraz pod hero stats, przed "Gotowy do treningu?"). Lista 3–5 zadań na dziś, każde jako wiersz z:
- ikoną (lucide), tytułem, krótkim opisem, czasem (~1–3 min), statusem (zrobione/nie),
- przyciskiem akcji po prawej (Start →) który nawiguje od razu do właściwej ścieżki.

Stan ukończenia per dzień trzymany w `localStorage` pod kluczem `bs:daily-tasks:YYYY-MM-DD` (reset o północy, bez backendu). Dodatkowo zadanie "Nagraj sesję" jest oznaczone jako zrobione jeśli `useRecentRecordings` zawiera nagranie z dzisiaj — automatyczna detekcja bez klikania.

Na górze paska:
- nagłówek "ZADANIA" (mono, uppercase, tracking) + data dnia po polsku,
- pasek postępu `X / Y zrobione` z gradientem primary.

### 2. Skład zadań (z istniejących danych — bez nowych tabel/hooków)
1. **Nagraj sesję** — z `useRecentRecordings`. Auto-complete jeśli istnieje recording z today. Akcja → `/record`.
2. **Dzisiejsze ćwiczenie** — z `useDailyDrill`. Tytuł i kategoria z drilla, +XP w opisie. Akcja → `/drills/{id}`. Complete = klik (localStorage).
3. **Sparring dnia** — statyczny opis "1 runda z mentorem". Akcja → `/sparring`. Complete = klik.
4. **Rozmowa do analizy** — "Wrzuć prawdziwą rozmowę i sprawdź swój wynik". Akcja → `/conversations/new`. Complete = klik.

(opcjonalnie 5: "Posłuchaj mówcy" → `/speakers` jeśli `profile.selected_speaker_id` istnieje)

### 3. Edycja `src/pages/Dashboard.tsx`
- Import `TasksSection`, render zaraz po sekcji "Hero stats" (linia 148), przed "Primary action".
- Zostawić istniejącą kartę "Dzisiejsze ćwiczenie" (linie 198–231) bez zmian — działa jako rozszerzony widok tego samego zadania; user wybiera czy klika z listy ZADAŃ czy z hero karty.

### 4. Pomocniczy plik `src/lib/dailyTasks.ts`
- `getTodayKey()` → `bs:daily-tasks:YYYY-MM-DD`
- `getCompletedTasks(): Set<string>` (czyta localStorage)
- `markTaskComplete(id: string)` / `unmarkTask(id: string)`
- `isToday(iso: string): boolean`
- Mały custom event `'daily-tasks:changed'` żeby sekcja odświeżała się po kliknięciu.

## Wizualnie
- Karta `card-premium`, padding `p-6`.
- Każde zadanie: hover-lift, lewa ikona w kółku z gradient kategorii, prawa strona `Button size="sm" variant="outline"` z "Start →"; zrobione = przekreślony tytuł + zielony check + szare tło.
- Mobile: pełna szerokość, akcja pod tekstem.

## Poza zakresem
- Nowa tabela w backendzie / RLS.
- Edycja CircleMenu, AppNav, Onboarding.
- Zmiana logiki XP / streak po ukończeniu zadania (tylko local checkmark).
