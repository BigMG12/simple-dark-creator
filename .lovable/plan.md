
## Cel

Zakładka wyniku rozmowy (`/conversations/:id`) ma wyglądać jak topowa wersja review zadań (`Results.tsx`): brutal/premium hero, mentor monogram, sekcje numerowane, cytat werdyktu, kolorowy akcent per typ, chess-style timeline z klikalnymi eventami zamiast płaskiej listy kart.

## Krok 1 — Persony per typ rozmowy

Rozbudować `src/data/conversationTypes.ts` o `monogram`, `mentorName`, `accentVar` (już mamy `accent`, wyekstrahujemy klucz), `verdictKicker`:

```text
sales        → "SP"  · "Sprzedawca"     · category-sales
meeting      → "OP"  · "Operator"        · category-influence
interviewee  → "KA"  · "Kandydat"        · category-authority
interviewer  → "PR"  · "Prowadzący"      · category-authority
negotiation  → "NG"  · "Negocjator"      · category-influence
coaching     → "CO"  · "Coach"           · category-leadership
```

## Krok 2 — Nowy layout `ConversationDetail.tsx`

Zachowujemy całą logikę danych (`useConversationResult`, mapping, `AnalyzingOverlay`, `scrollToLine`, `showOther`). Zmieniamy tylko warstwę prezentacyjną, w kolejności odpowiadającej `Results.tsx`:

```text
┌ HeroStrip (score + verdict label + monogram)          [reuse]
│
├ Header: MentorMonogramBackdrop + MentorAvatar (typ rozmowy)
│
├ SEKCJA 1 — WERDYKT
│   • VerdictBanner (score, akcent typu)
│   • WeakestStrongestBadges (najsłabsza / najsilniejsza metryka)
│   • card-brutal z cytatem: "{summary}"  (dropcap, Georgia italic, kolor akcentu)
│
├ SEKCJA 2 — KONTEKST
│   SectionHeader "Kontekst" + card-brutal z stakes / goal / otherParty
│   + pill-y: data, czas trwania, typ
│
├ SEKCJA 3 — OŚ CZASU (chess-style)
│   SectionHeader "Kluczowe momenty"
│   Zamiast poziomego scrolla → pionowa oś z markerami event-color,
│   każdy klikalny → scrollToLine; hover pokazuje snippet.
│   Powyżej mini-mapa jakości (bar per event z EVENT_COLOR).
│
├ SEKCJA 4 — LICZBY
│   SectionHeader "Twoje metryki"
│   Reuse MetricsGrid / MetricTile z Results (spójny wygląd),
│   źródło: c.metrics (label/value/description/benchmark/good).
│
├ SEKCJA 5 — MOMENTY PRAWDY (jeśli są)
│   card-brutal + Quote icon + coachNote + proAlternative (bez zmian danych,
│   ale w stylu MentorFeedbackSections).
│
├ SEKCJA 6 — TRANSKRYPT
│   card-brutal, sticky toggle "pokaż drugiego mówcę",
│   linia "Ty" = lewy border akcent typu, "Inny" = muted.
│
├ SEKCJA 7 — SCORECARD (radar)
│   Zachowujemy `ScorecardRadar`, ale ubieramy w card-brutal +
│   SectionHeader "Porównanie" + legenda w font-mono.
│
├ Closing quote (jeśli `summary` długie) — jak w Results
│
└ BrutalCTA (reuse) → "Nowa rozmowa" / "Wróć do biblioteki" / "Panel"
```

## Krok 3 — Reużyte komponenty (bez zmian API)

- `HeroStrip`, `MentorMonogramBackdrop`, `MentorAvatar`, `VerdictBanner`, `WeakestStrongestBadges`, `SectionHeader`, `MetricsGrid`, `MetricTile`, `BrutalCTA` z `src/components/results/`.
- `card-brutal`, `bg-gradient-hero`, `text-gradient-primary` — istniejące klasy semantyczne.

## Krok 4 — Nowy komponent

`src/components/results/ConversationTimeline.tsx` — pionowa oś z klikalnymi kartami eventów + mini-mapa u góry. Wewnętrzny, zamknięty scope (żeby nie mieszać do chess-results, który jest per-zdanie z prosody).

## Krok 5 — Detale wizualne

- Akcent kolorystyczny: `hsl(var(--${conversationTypeMeta.accentVar}))` — jak w Results.
- Kicker font-mono `text-[10px] uppercase tracking-[0.4em]`.
- Nagłówki `font-display` (istniejący token), cytaty `Georgia serif italic`.
- Ambient glow (dwa blur-3xl kółka jak w Results).
- Zero hard-coded `text-white` / `bg-black` — wszystko przez tokeny.

## Poza scope

- Backend / dane / typy rozmowy — bez zmian.
- `AnalyzingOverlay` — bez zmian (działa).
- `Reviews.tsx`, `ConversationsLibrary.tsx` — nie ruszamy.
- `ChessTimelineSection` per-zdanie z prosody — to jest dla nagrań solo, nie dokładamy do rozmów.

## Techniczne szczegóły

- Plik main: `src/pages/ConversationDetail.tsx` — refactor sekcji renderującej (od `return` w AppShell).
- Nowy: `src/components/results/ConversationTimeline.tsx`.
- Edit: `src/data/conversationTypes.ts` — dodać pola persony.
- Weryfikacja: `tsgo` + otwarcie `/conversations/:id` w Playwright, screenshot 402×637 (viewport użytkownika) + 1280×1800.
