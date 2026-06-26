# RECOVERY INVENTORY — BIG SPEAKING
**Data inwentaryzacji:** 2026-04-25  
**Status:** Diagnoza zakończona — CZEKAM NA ZGODĘ przed naprawą

═══════════════════════════════════════════════════════════════
## SEKCJA 1: STRUKTURA REPO
═══════════════════════════════════════════════════════════════

### Pliki migracji
- **Liczba plików:** 36 plików `.sql` w `supabase/migrations/`
- **Zakres numeracji:** 001–032 (z duplikatami)
- **Duplikaty numerów wersji:**
  - `002` — 2 pliki (002_rpc_functions.sql, 002_seed_data.sql)
  - `003` — 2 pliki (003_seed_complete.sql, 003_storage_layer.sql)
  - `004` — 2 pliki (004_enable_realtime.sql, 004_storage_cleanup.sql)
  - `005` — 3 pliki (005_speaker_imports.sql, 005_style_matching.sql, 005_v2_features.sql)
  - `006` — 2 pliki (006_import_helpers.sql, 006_import_reliability.sql)
  - `012` — 2 pliki (012_audit_fixes.sql, 012_fix_profile_trigger.sql)
  - `022` — 2 pliki (022_seed_data.sql, 022_user_goals_and_records.sql)

### Edge Functions
- **Liczba folderów:** 16 funkcji + folder `_shared`
- **Lista funkcji:**
  1. analyze-conversation
  2. analyze-recording
  3. cancel-import
  4. create-speaker-import-job
  5. detect-stagnation
  6. embed-speech-samples
  7. generate-daily-insight
  8. generate-speaker-persona
  9. generate-weekly-review
  10. notify-import-complete
  11. process-conversation
  12. process-transcripts
  13. retry-import
  14. retry-stuck-imports
  15. run-import-orchestrator
  16. select-user-speaker

### Frontend
- **Konfiguracja Supabase:** `src/lib/supabase.ts` ✅ ISTNIEJE
- **Struktura src/:** components, contexts, data, hooks, lib, pages, test, types

═══════════════════════════════════════════════════════════════
## SEKCJA 2: STAN MIGRACJI W BAZIE
═══════════════════════════════════════════════════════════════

### Migracje zaaplikowane na Remote
✅ Zaaplikowane (mają kolumnę Remote):
- 001, 002 (jedna z dwóch), 003 (jedna z dwóch), 004 (jedna z dwóch)
- 005 (jedna z trzech), 006 (jedna z dwóch), 007, 008, 009, 010, 011
- 013, 014, 015, 016, 022 (jedna z dwóch), 023, 024, 025, 026, 027
- 028, 029, 030, 031, 032

### Migracje lokalne NIE zaaplikowane
❌ Tylko Local (brak Remote):
- 002_seed_data.sql (drugi plik 002)
- 003_storage_layer.sql (drugi plik 003)
- 004_storage_cleanup.sql (drugi plik 004)
- 005_style_matching.sql (drugi plik 005)
- 005_v2_features.sql (trzeci plik 005)
- 006_import_reliability.sql (drugi plik 006)
- 012_audit_fixes.sql (pierwszy plik 012)
- 012_fix_profile_trigger.sql (drugi plik 012)
- 020_mentor_specific_metrics.sql
- 022_user_goals_and_records.sql (drugi plik 022)

**PROBLEM:** 10 migracji lokalnych nie jest zaaplikowanych na zdalnej bazie.

═══════════════════════════════════════════════════════════════
## SEKCJA 3: STAN EDGE FUNCTIONS
═══════════════════════════════════════════════════════════════

### Funkcje wdrożone na Supabase
✅ Wszystkie 16 funkcji jest ACTIVE:

| Nazwa | Status | Wersja | Ostatnia aktualizacja |
|-------|--------|--------|----------------------|
| analyze-conversation | ACTIVE | 4 | 2026-04-24 16:21:34 |
| analyze-recording | ACTIVE | 6 | 2026-04-24 16:21:35 |
| cancel-import | ACTIVE | 6 | 2026-04-24 16:21:36 |
| create-speaker-import-job | ACTIVE | 8 | 2026-04-25 07:27:50 |
| detect-stagnation | ACTIVE | 4 | 2026-04-24 16:21:37 |
| embed-speech-samples | ACTIVE | 4 | 2026-04-24 16:21:38 |
| generate-daily-insight | ACTIVE | 4 | 2026-04-24 16:21:39 |
| generate-speaker-persona | ACTIVE | 4 | 2026-04-24 16:21:40 |
| generate-weekly-review | ACTIVE | 4 | 2026-04-24 16:21:41 |
| notify-import-complete | ACTIVE | 4 | 2026-04-24 16:21:42 |
| process-conversation | ACTIVE | 4 | 2026-04-24 16:21:43 |
| process-transcripts | ACTIVE | 4 | 2026-04-24 16:21:44 |
| retry-import | ACTIVE | 4 | 2026-04-24 16:21:45 |
| retry-stuck-imports | ACTIVE | 4 | 2026-04-24 16:21:46 |
| run-import-orchestrator | ACTIVE | 4 | 2026-04-24 16:21:47 |
| select-user-speaker | ACTIVE | 4 | 2026-04-24 16:21:48 |

**STATUS:** ✅ Wszystkie funkcje lokalne są wdrożone. Brak rozbieżności.

═══════════════════════════════════════════════════════════════
## SEKCJA 4: SEKRETY
═══════════════════════════════════════════════════════════════

### Sekrety ustawione na Supabase
✅ Wszystkie wymagane sekrety są skonfigurowane:

**Wymagane (obecne):**
- ✅ OPENAI_API_KEY
- ✅ DEEPGRAM_API_KEY
- ✅ YOUTUBE_API_KEY
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ SUPABASE_ANON_KEY
- ✅ RESEND_API_KEY (opcjonalny)
- ✅ SPOTIFY_CLIENT_ID (opcjonalny)
- ✅ SPOTIFY_CLIENT_SECRET (opcjonalny)

**Dodatkowe:**
- ANTHROPIC_API_KEY
- SUPABASE_DB_URL
- SUPABASE_JWKS

**STATUS:** ✅ Wszystkie sekrety są poprawnie skonfigurowane.

═══════════════════════════════════════════════════════════════
## SEKCJA 5: STAN BAZY DANYCH
═══════════════════════════════════════════════════════════════

**UWAGA:** Nie mam bezpośredniego dostępu do remote DB przez psql.

### Zapytania do wykonania ręcznie
Przygotowałem plik `check_database_state.sql` z następującymi queries:

1. **Lista tabel** — sprawdzi czy wszystkie tabele z migracji istnieją
2. **Lista RPC functions** — sprawdzi czy funkcje SQL są wdrożone
3. **Storage buckets** — sprawdzi konfigurację Storage
4. **Liczba wierszy** — sprawdzi czy są dane seed w tabelach:
   - speakers
   - drills
   - badges
   - speaker_categories

**AKCJA WYMAGANA:** Wykonaj queries z `check_database_state.sql` w Supabase SQL Editor i prześlij mi wyniki.

═══════════════════════════════════════════════════════════════
## SEKCJA 6: STAN FRONTENDU
═══════════════════════════════════════════════════════════════

### Build
✅ **Build przeszedł POMYŚLNIE**

**Ostrzeżenia (nie-krytyczne):**
- Bundle size: 1.5 MB (duży, ale nie blokujący)
- Sugestia: rozważ code-splitting przez dynamic import()
- Browserslist data: 10 miesięcy stare (kosmetyczne)

### Zmienne środowiskowe
✅ **Plik `.env` istnieje i zawiera:**
- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_ANON_KEY` ✅

**STATUS:** ✅ Frontend kompiluje się bez błędów i ma poprawną konfigurację Supabase.

═══════════════════════════════════════════════════════════════
## PRIORYTETOWA LISTA NAPRAW
═══════════════════════════════════════════════════════════════

### 🔴 CRITICAL — bez tego appka może nie działać

1. **Duplikaty numerów migracji**
   - Problem: 7 numerów wersji ma duplikaty (002, 003, 004, 005, 006, 012, 022)
   - Skutek: Supabase nie wie którą migrację zaaplikować
   - Naprawa: Renumeracja duplikatów na unikalne numery (033–042)

2. **10 niezaaplikowanych migracji**
   - Problem: Migracje są w repo, ale nie w bazie
   - Skutek: Brakujące tabele/kolumny/funkcje mogą powodować błędy runtime
   - Naprawa: Po renumeracji → `supabase db push` lub ręczne zaaplikowanie
   - **WYMAGA WERYFIKACJI:** Sprawdź najpierw stan bazy (Sekcja 5) żeby nie nadpisać danych

3. **Weryfikacja stanu bazy danych**
   - Problem: Nie wiem czy tabele/funkcje/dane istnieją w bazie
   - Skutek: Mogę zaproponować złą strategię naprawy
   - Naprawa: Wykonaj queries z `check_database_state.sql`

### 🟡 IMPORTANT — feature może nie działać, ale core OK

4. **Brak migracji 017–019, 021**
   - Problem: Luki w numeracji (po 016 jest 020, po 020 jest 022)
   - Skutek: Prawdopodobnie usunięte/zmergowane migracje — nie problem jeśli ich zawartość jest w innych
   - Naprawa: Weryfikacja czy funkcjonalność z tych migracji jest gdzie indziej

5. **Bundle size 1.5 MB**
   - Problem: Duży rozmiar bundle'a
   - Skutek: Wolniejsze ładowanie aplikacji
   - Naprawa: Code-splitting przez dynamic import() (optymalizacja)

### 🟢 NICE-TO-HAVE — pomijalne

6. **Supabase CLI outdated**
   - Wersja: 2.78.1 (aktualna: 2.90.0)
   - Skutek: Brak nowych features/bugfixów
   - Naprawa: `npm install -g supabase@latest`

7. **Browserslist data stare**
   - Wiek: 10 miesięcy
   - Skutek: Może generować niepotrzebne polyfills
   - Naprawa: `npx update-browserslist-db@latest`

═══════════════════════════════════════════════════════════════
## NASTĘPNE KROKI (po Twojej zgodzie)
═══════════════════════════════════════════════════════════════

1. **Najpierw:** Wykonaj queries z `check_database_state.sql` i prześlij wyniki
2. **Potem:** Na podstawie stanu bazy zaproponuję strategię naprawy migracji
3. **Opcje naprawy:**
   - Opcja A: Renumeracja duplikatów + push brakujących migracji
   - Opcja B: Jeśli baza ma już te zmiany — usunięcie duplikatów lokalnych
   - Opcja C: Merge duplikatów w jedną migrację (jeśli się nie konfliktują)

**CZEKAM NA TWOJĄ DECYZJĘ — nie wprowadzam żadnych zmian.**
