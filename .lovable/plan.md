# Plan: kinowy ekran /onboarding "WITAJ W MIEJSCU TWOJEJ ZMIANY"

## Cel
Stworzyć nową, mocno aesthetic stronę powitalną pod `/onboarding`, którą nowy użytkownik widzi zaraz po rejestracji — przed jakimkolwiek menu/zadaniami. Z dwiema akcjami: obejrzyj VSL albo pomiń tutorial. Istniejący `/welcome` (CircleMenu) zostaje bez zmian.

## Co powstanie

### 1. Nowa strona `src/pages/Onboarding.tsx`
Pełnoekranowy, czarny, kinowy layout (Cinematic Noir: `#0a0a0a` tło, `#1a1a1a` warstwy, akcent ognia `#e85d3a`, ciepły bursztyn `#f0d78c`).

Struktura:
- Tło: głęboka czerń z subtelną radialną poświatą bursztynu w rogu + delikatny grain/noise overlay.
- Mały eyebrow: `WITAJ` (mono, uppercase, tracking, kolor bursztynu, fade-in).
- Headline H1: **„W MIEJSCU TWOJEJ ZMIANY"** — gigantyczna, serif display (np. Instrument Serif), z animowanym staggered reveal słowo po słowie.
- Podtytuł: krótka linia w tonie — „Tu zaczyna się Twój głos. Wybierz, jak chcesz wejść."
- Dwie karty CTA side-by-side (na mobile w stacku):
  1. **Obejrzyj wprowadzenie (VSL)** — duża karta z ikoną Play w kole ognistym, opisem „2 min. Pokażę Ci jak działa Big Speaking i jak zbudować swój plan nauki." → otwiera modal z odtwarzaczem.
  2. **Pomiń i eksploruj sam** — bardziej dyskretna, outline, „Przejdź od razu do aplikacji." → nawiguje na `/welcome`.
- Stopka: maleńki licznik kroków „01 / 01" + linia.

Mikrointerakcje: hover-lift na kartach, glow na ikonie play, kursor-aware light w karcie VSL.

### 2. Nowy komponent `src/components/onboarding/VSLModal.tsx`
- Pełnoekranowy ciemny modal (Dialog z shadcn) z natywnym `<video controls>` na pusty `src` (placeholder URL `/intro.mp4` — do podmiany przez użytkownika później).
- Pod wideo: dwa CTA — „Mam plan, zacznijmy" → `/welcome`, oraz „Zamknij".
- Esc/X zamyka, scroll-lock.

### 3. Routing
W `src/App.tsx` dodać `<Route path="/onboarding" element={<Onboarding />} />`.

### 4. Redirect po rejestracji
W `src/lib/auth.ts` (`signUpWithEmail`) zmienić aktualne przekierowanie po auto-loginie z `/welcome` na `/onboarding`. Logowanie istniejącego konta nadal idzie tam gdzie szło. Welcome email CTA zostawiamy bez zmian (lub też kierujemy na `/onboarding` — do potwierdzenia w trakcie).

## Szczegóły techniczne
- Font display: `@fontsource/instrument-serif` + już używany sans do reszty; instalacja przez `bun add`, import w `src/main.tsx`, mapowanie w `tailwind.config.ts` jako `font-display`.
- Wszystkie kolory jako tokeny w `index.css` (`--onboarding-bg`, `--ember`, `--amber-warm`) — bez hardkodowania hexów w komponentach.
- Animacje: tailwind `animate-fade-in` + niestandardowy keyframe `reveal-up` z opóźnieniami `style={{animationDelay}}`.
- Plik wideo: brak realnego — `<video>` z pustym `src` i posterem; obok info „Wideo wkrótce" jeśli `src` puste.
- Brak zmian w `Welcome.tsx`, `Dashboard.tsx`, edge functions.

## Pliki
- nowy: `src/pages/Onboarding.tsx`
- nowy: `src/components/onboarding/VSLModal.tsx`
- edycja: `src/App.tsx` (route)
- edycja: `src/lib/auth.ts` (redirect target)
- edycja: `src/index.css` (tokeny noir/ember)
- edycja: `tailwind.config.ts` (font-display, keyframe `reveal-up`)
- edycja: `src/main.tsx` (import fontu)

## Poza zakresem
- Hosting realnego pliku VSL (podstawisz później).
- Zmiany w CircleMenu / Dashboard.
- Tłumaczenia / i18n.
