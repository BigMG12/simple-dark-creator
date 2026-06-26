# Diagnoza: "No target speaker configured"

Data: 2026-04-25
Status: vR7 — agresywny cache-bust po potwierdzeniu, że vR6 nie został zdeployowany

## Objaw
Po nagraniu sesji, edge function `analyze-recording` zwraca błąd:
```
Code: BACKEND_FAILED
Title: Brak skonfigurowanego mentora
Raw: No target speaker configured
```

## Co odkryliśmy

### Faza 1 — dane w bazie (z network logs frontendu)
- `recordings.mentor_speaker_id` = `b6bc4a26-791f-47bc-984c-92c9fc2f7b6a` ✅ NIE NULL
- `profiles.selected_speaker_id` = ten sam UUID (Barack Obama) ✅
- Wszystkie 5 ostatnich nagrań mają ten sam poprawny `mentor_speaker_id`
- Speaker o tym ID istnieje w `speakers` ✅

**Dane są poprawne.**

### Faza 2 — kod edge function w repo
Aktualny kod `supabase/functions/analyze-recording/index.ts` ma **3 warstwy fallbacków**:
1. `recording.mentor_speaker_id`
2. `profile.selected_speaker_id`
3. `fetchTargetSpeaker(null)` → speaker z najniższym `sort_order`, finalnie jakikolwiek

Komunikat błędu w obecnym kodzie brzmi:
```
Mentor unavailable (recording=… profile=… speakers_in_db=N). Seed the speakers table or pick a mentor.
```

String `"No target speaker configured"` **nie istnieje nigdzie w obecnym repo** (potwierdzone grepem).

### Faza 3 — frontend (`src/pages/RecordLive.tsx`)
Insert do `recordings` poprawnie umieszcza `mentor_speaker_id` z fallbackiem na `profile.selected_speaker_id`. Dane w bazie potwierdzają że to działa.

### Faza 4 — Root cause: STALE DEPLOYMENT
Logi edge function pokazują JEDYNIE komunikat `"No target speaker configured"` i nic więcej z naszych nowych logów (`mentor lookup …`, `resolver=v…`, `Mentor unavailable …`).

Wniosek: **Lovable Cloud serwuje stary, zcache'owany build edge function** sprzed wszystkich naszych poprawek. Wcześniejsze "version bumpy" w komentarzach nie spowodowały realnego redeployu.

## Naprawa (vR6)

### 1. Strukturalne zmiany w `analyze-recording/index.ts`
- Top-level `console.log` z markerem wersji (wystrzeli przy każdym cold-start)
- Stałe `ANALYZE_RECORDING_VERSION` i `ANALYZE_RECORDING_BUILT_AT`
- Per-request log wersji w handlerze
- Endpoint `GET /version` zwracający `{ version, builtAt }` — można sprawdzić curl-em

### 2. Frontend retry (`src/pages/Analyzing.tsx`)
Zamiast nawigować do `/record`, przycisk "Spróbuj ponownie" reloaduje stronę z tym samym `recordingId` z `sessionStorage`. Handler edge function automatycznie resetuje `status` na `analyzing`, więc retry działa naturalnie i można odzyskać stare failed nagrania.

## Plan testu
1. **Test wersji**: w Supabase Dashboard → Edge Functions → analyze-recording → Logs sprawdzić czy widać:
   ```
   [analyze-recording] module loaded v2026-04-25-r6-mentor-fallback-cachebust at <ISO>
   ```
   Jeśli BRAK — Lovable Cloud nadal serwuje stary build → eskalacja do supportu.

2. **Test nowego nagrania**: nagrać klip. W logach musi pojawić się:
   ```
   [analyze-recording] request received — version=v2026-04-25-r6-…
   [analyze-recording bg <id>] mentor lookup — recording=… profile=…
   [analyze-recording bg <id>] resolver=v2026-04-25-r6-…
   ```

3. **Test retry**: na ekranie błędu jednego ze starych nagrań kliknąć "Spróbuj ponownie" → strona się przeładuje i wyśle nowe `invoke` z tym samym `recordingId`.

## Pliki zmienione
- `supabase/functions/analyze-recording/index.ts`
- `src/pages/Analyzing.tsx`
- `MENTOR_DIAGNOSIS.md` (ten plik)

---

## vR7 — Agresywny cache-bust (2026-04-25, po vR6)

### Dlaczego vR7?
Po deployu vR6 użytkownik nagrał nowy klip. Logi pokazały:
- ❌ BRAK linii `[analyze-recording] module loaded v2026-04-25-r6-…` przy cold-start
- ❌ BRAK linii `mentor lookup — recording=… profile=…`
- ❌ BRAK linii `resolver=v…`
- ✅ Nadal stary błąd: `failed: No target speaker configured` — string KTÓREGO NIE MA W AKTUALNYM REPO

`deployment_id` w metadanych: `..._6` (czyli platforma uważa że deploy jest "wersja 6"), ale runtime wykonuje stary bytecode. Klasyczny stale-deployment.

### Co zmieniliśmy w vR7 (w `index.ts`)
1. **Nowa stała wersji**: `v2026-04-25-r7-AGGRESSIVE-CACHEBUST-7Q3K9X`
2. **Unikalny sentinel**: `DEPLOY_SENTINEL_7Q3K9X = "SENTINEL-7Q3K9X-MENTOR-FALLBACK-ALIVE"` — string którego stary build NIE MOŻE zawierać.
3. **Strukturalna zmiana handlera**: zamiast `Deno.serve(async (req) => { … })` mamy nazwaną funkcję `handleAnalyzeRequest(request)` rejestrowaną przez `Deno.serve(handleAnalyzeRequest)`. Inna sygnatura → inny bundle hash.
4. **Log na pierwszej linii handlera**: `▶ HANDLER ENTER <method> sentinel=…` — pokazuje się przy KAŻDYM requeście, nawet zanim cokolwiek innego się wykona.
5. **Endpoint `GET /version`** rozszerzony o pole `sentinel`.

### Plan testu vR7
1. Zerknąć w logi po deployu — szukać `🚀 BOOT v2026-04-25-r7-AGGRESSIVE-CACHEBUST-7Q3K9X sentinel=SENTINEL-7Q3K9X-MENTOR-FALLBACK-ALIVE`.
2. Jeśli **jest** → nagrać nowy klip. Powinniśmy zobaczyć cały łańcuch (`HANDLER ENTER` → `mentor lookup` → `resolver=v…r7…` → `using speaker …` → `complete`).
3. Jeśli **nadal brak** → potwierdzony bug po stronie Lovable Cloud (cache deploya nie jest invalidowany mimo zmian źródła i sygnatury handlera). Eskalacja do supportu Lovable z tym dokumentem jako dowodem.

---

## Root cause #4 — schema-mismatch w `persona_profile` (2026-04-29)

### Objaw
Ekran błędu: `Cannot read properties of undefined (reading 'one_sentence_essence')` na `recording_id` `b3e84c4e-…`.

### Realna przyczyna
`supabase/functions/analyze-recording/index.ts` (linia ~397) decydował o gałęzi v1/v2 wyłącznie po polu `persona_profile.version === 'v2_brutal_polish'`. W bazie istnieją mentorzy o kształcie v2 (`LAYER_1_identity`, `LAYER_2_*`, `LAYER_3_*`), ale bez tego pola — wpadali w gałąź v1, gdzie `mentor-prompt-builder.ts` linia 80 robił `persona.identity.one_sentence_essence`. `persona.identity` było `undefined` → `TypeError` → bg-task pisał błąd do `recordings.error_message` → frontend pokazywał ten dokładnie komunikat.

### Co naprawione
1. `mentor-prompt-builder.ts` — wszystkie odczyty pól idą przez defensywne helpery `s/arr/n/rangeStr/joinOrDash/bullets`. Builder nigdy nie wybucha, niezależnie od kształtu.
2. `mentor-analysis.ts` — przed buildem promptu twardy schema-check v1; rzuca `MENTOR_PROFILE_INCOMPATIBLE` z listą brakujących ścieżek i obecnych kluczy.
3. `index.ts`:
   - **detekcja strukturalna** v1/v2 (`LAYER_1_identity` vs `identity.one_sentence_essence`), nie tylko po polu `version`,
   - log `persona_profile keys for <name>: [...]` przed routingiem — natychmiastowa diagnoza w logach,
   - nowy helper `pickCompatibleSpeaker(...)` — gdy wybrany mentor ma uszkodzony profil, wybierany jest inny mentor z poprawnym kształtem (preferując v2). Dopiero jeśli żaden nie pasuje — czytelny `AnalysisError`.

### Trwała eliminacja
Aby wyrównać dane: `UPDATE speakers SET persona_profile = persona_profile || '{"version":"v2_brutal_polish"}'::jsonb WHERE persona_profile ? 'LAYER_1_identity' AND NOT (persona_profile ? 'version');` — ale po obecnym fixie nie jest to wymagane do działania, jedynie poprawia spójność.

---

## Root cause #5 — fix nie mógł wejść, bo bundle nie przechodził `deno check` (2026-04-29)

### Objaw
Nowe nagranie `98f9dd7b-c882-439b-964d-61ae25a9c66e` nadal pokazało:
```
Code: BACKEND_FAILED
Raw: Cannot read properties of undefined (reading 'one_sentence_essence')
```

### Co znaleziono
Przed naprawą `deno check supabase/functions/analyze-recording/index.ts` zwracał 8 błędów kompilacji:
- `enhanced-analysis.ts` — niepoprawnie typowany `statusOrder[a.status]`.
- `index.ts` — trzy martwe referencje do nieistniejącego `mentorAnalysis` po rozdzieleniu v1/v2.
- `mentor-analysis-v2.ts` — odczyt `speaker.category_name`, którego nie ma w `SpeakerWithCategory`.
- `metrics-with-context.ts` — odczyt `rawMetrics.transcript`, którego nie ma w bazowym typie `RawMetrics`.

To oznaczało, że poprawka `one_sentence_essence` mogła nie deployować się do runtime mimo zmian w repo.

### Co zrobiono
1. Naprawiono wszystkie blokery `deno check` w dependency graph `analyze-recording`.
2. Dodano sentinel runtime: `SENTINEL-9N4M2Q-COMPILE-UNBLOCK-PERSONA-SHAPE` i wersję `v2026-04-29-r8-COMPILE-UNBLOCK-PERSONA-SHAPE-9N4M2Q`.
3. Routing persona_profile jest teraz strukturalny:
   - v2 wymaga kompletnego kształtu warstw `LAYER_*`, nie tylko `version`.
   - v1 wymaga `identity.one_sentence_essence`.
   - brak kompatybilności daje kontrolowany `MENTOR_PROFILE_INCOMPATIBLE`, nie JS TypeError.
4. `mentor-analysis-v2.ts` normalizuje runtime-only `version: "v2_brutal_polish"` dla poprawnych profili v2 bez mutowania DB.
5. Utworzono finalny `supabase/config.toml`:
   ```toml
   project_id = "hthjuoswarvsfssxqxxj"

   [functions.analyze-recording]
   verify_jwt = true
   ```
6. `supabase/supabase/` przeniesiono do `supabase_supabase_archive/`; znaleziono tam tylko CLI metadata i `test-edge-function.sh`.

### Weryfikacja lokalna
`deno check supabase/functions/analyze-recording/index.ts` — PASS.

### Weryfikacja runtime
Autoryzowany `GET /functions/v1/analyze-recording/version` po zmianach nadal zwracał starą wersję:
```
{"version":"v2026-04-25-r6-mentor-fallback-cachebust", ...}
```
Czyli na moment testu nowy sentinel `SENTINEL-9N4M2Q-COMPILE-UNBLOCK-PERSONA-SHAPE` nie był jeszcze widoczny w chmurze. Po automatycznym redeploy należy oczekiwać dokładnie tej wersji/sentinela; jeśli nadal jest r6, problemem pozostaje stale deployment pipeline.

---

## Root cause #6 — live runtime nadal r6 mimo poprawnego repo (2026-04-29)

### Nowe dowody
1. Preview wysłał realny request:
   ```
   POST /functions/v1/analyze-recording
   Status: 202
   Response: {"status":"analyzing","recording_id":"5e614b60-fc42-4b77-93f3-ed96904ed504"}
   ```
   Invoke działa, a błąd pojawia się dopiero w background tasku przez `recordings.error_message`.

2. Autoryzowany test wersji chmury nadal zwrócił stary bundle:
   ```
   {"version":"v2026-04-25-r6-mentor-fallback-cachebust","builtAt":"2026-04-29T18:56:23.727Z"}
   ```

3. Lokalny kod repo ma już r8/r9 i defensywny builder, w którym `identity` ma fallback:
   ```ts
   const identity = (persona.identity ?? {}) as Record<string, unknown>;
   ```
   Dlatego `Cannot read properties of undefined (reading 'one_sentence_essence')` nie pasuje do aktualnego kodu repo — pasuje do starego r6.

### Co dodano w r9
1. Nowy sentinel: `SENTINEL-H8P4D2-DEPLOY-REALITY-CHECK-RUNTIME-VISIBLE`.
2. `GET /version` zwraca pełne runtime diagnostics: `version`, `sentinel`, `handlerSource`, `modules`.
3. `POST analyze-recording` zwraca w 202: `runtime_version` i `sentinel`, żeby network snapshot od razu ujawniał faktyczny bundle.
4. Start retry resetuje `recordings.error_message = null`, nie tylko `status = analyzing`.
5. Frontend wykrywa brak `runtime_version` albo stare r6 i pokazuje `STALE_BACKEND_BUNDLE` zamiast mylącego zwykłego `BACKEND_FAILED`.

### Oczekiwany test po redeploy
PASS:
```
GET /functions/v1/analyze-recording/version
→ version = v2026-04-29-r9-DEPLOY-REALITY-CHECK-H8P4D2
→ sentinel = SENTINEL-H8P4D2-DEPLOY-REALITY-CHECK-RUNTIME-VISIBLE
```

FAIL:
```
GET /version nadal zwraca v2026-04-25-r6-mentor-fallback-cachebust
```
Wtedy problem jest definitywnie w pipeline/cache deploymentu funkcji, a nie w logice `persona_profile`.

### Wynik po wdrożeniu zmian w repo
1. `deno check supabase/functions/analyze-recording/index.ts` — PASS.
2. `deno check supabase/functions/analyze-recording-hotfix/index.ts` — PASS.
3. `GET /functions/v1/analyze-recording/version` przez 12 prób nadal zwracał r6.
4. Utworzono awaryjną funkcję `analyze-recording-hotfix`, ale live endpoint nadal zwraca `404 Requested function was not found`, czyli automatyczny deploy nie opublikował nowej funkcji.
5. Supabase CLI jest dostępny przez `npx supabase@latest`, ale ręczny deploy jest zablokowany, bo środowisko nie ma `SUPABASE_ACCESS_TOKEN`:
   ```
   Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
   ```

### Aktualny status
Repo jest gotowe na realny deploy r9/hotfix, ale deployment backendu jest zablokowany poza kodem: stary endpoint nadal serwuje r6, a nowy endpoint nie został opublikowany. Potrzebny jest dostęp deploy token / ręczny redeploy w panelu backendu.
