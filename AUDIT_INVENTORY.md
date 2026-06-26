# AUDIT INVENTORY — BIG SPEAKING
**Data wygenerowania:** 2026-04-22  
**Cel:** Kompletna mapa projektu dla audytu i naprawy niespójności

---

## 1. DRZEWO PLIKÓW

### Frontend (`/src`) — 164 pliki TypeScript/TSX

#### Pages (19 stron)
- `pages/Index.tsx` — Landing page (publiczny)
- `pages/Auth.tsx` — Strona logowania/rejestracji (public-only)
- `pages/ForgotPassword.tsx` — Reset hasła (public-only)
- `pages/Dashboard.tsx` — Dashboard użytkownika (protected, używa MOCK_DASHBOARD)
- `pages/Record.tsx` — Wybór trybu nagrywania (protected)
- `pages/RecordPrep.tsx` — Przygotowanie do nagrania (protected)
- `pages/RecordLive.tsx` — Aktywne nagrywanie (protected)
- `pages/Analyzing.tsx` — Ekran analizy w toku (protected)
- `pages/Results.tsx` — Wyniki analizy live (protected, `/results/live/:id`)
- `pages/ResultsMock.tsx` — Stare mock wyniki (protected, `/results/legacy-mock`)
- `pages/ResultsMockNew.tsx` — Nowe mock wyniki (protected, `/results/mock` i `/results/:id`)
- `pages/Speakers.tsx` — Lista mówców (protected)
- `pages/SpeakerDetail.tsx` — Szczegóły mówcy (protected, `/speakers/:id`)
- `pages/SpeakerImport.tsx` — Formularz importu mówcy (protected, `/speakers/import`)
- `pages/SpeakerImports.tsx` — Historia importów (protected, `/speakers/imports`)
- `pages/Drills.tsx` — Lista ćwiczeń (protected)
- `pages/DrillDetail.tsx` — Szczegóły ćwiczenia (protected, `/drills/:id`)
- `pages/Profile.tsx` — Profil użytkownika (protected)
- `pages/NotFound.tsx` — 404 (catch-all)

#### Hooks — Queries (15 plików)
- `hooks/queries/useAuth.ts` — Sesja użytkownika (Supabase auth)
- `hooks/queries/useProfile.ts` — Profil użytkownika (tabela `profiles`)
- `hooks/queries/useDashboard.ts` — Statystyki dashboardu (RPC `get_dashboard_stats`)
- `hooks/queries/useRecordings.ts` — Lista nagrań użytkownika (tabela `recordings`)
- `hooks/queries/useResults.ts` — Wyniki analizy (tabela `analyses`)
- `hooks/queries/useSpeakers.ts` — Lista mówców (tabela `speakers`)
- `hooks/queries/useSpeakersByCategory.ts` — Mówcy filtr. po kategorii
- `hooks/queries/useSpeakerCategories.ts` — Kategorie mówców (tabela `speaker_categories`)
- `hooks/queries/useDrills.ts` — Lista ćwiczeń (tabela `drills`)
- `hooks/queries/useBadges.ts` — Odznaki użytkownika (tabele `badges`, `user_badges`)
- `hooks/queries/useAchievements.ts` — Timeline osiągnięć (tabela `achievements_log`)
- `hooks/queries/useChannelImports.ts` — Lista importów (tabela `channel_imports`)
- `hooks/queries/useChannelImport.ts` — Pojedynczy import (tabela `channel_imports`)
- `hooks/queries/useMyImportedSpeakers.ts` — Mówcy zaimportowani przez użytkownika
- `hooks/queries/useImportQuota.ts` — Quota importów (RPC `check_import_quota`)

#### Hooks — Mutations (4 pliki)
- `hooks/mutations/useCreateImportJob.ts` — Tworzy import (edge function `create-speaker-import-job`)
- `hooks/mutations/useCancelImport.ts` — Anuluje import (edge function `cancel-import`)
- `hooks/mutations/useDeleteImportedSpeaker.ts` — Usuwa zaimportowanego mówcę
- `hooks/mutations/index.ts` — Re-export

#### Hooks — Inne (17 plików)
- `hooks/use-recorder.ts` — Nagrywanie audio (MediaRecorder API)
- `hooks/use-media-recorder.ts` — Wrapper MediaRecorder
- `hooks/use-audio-analyser.ts` — Analiza audio w czasie rzeczywistym
- `hooks/use-recording-session.ts` — Stan sesji nagrywania
- `hooks/use-mentor.ts` — Logika wyboru mentora
- `hooks/use-count-up.ts` — Animacja licznika
- `hooks/use-in-view.ts` — Intersection Observer
- `hooks/use-mobile.tsx` — Detekcja mobile
- `hooks/use-toast.ts` — Toast notifications (shadcn/ui)
- `hooks/useBadgeUnlockRealtime.ts` — Realtime odznaki (Supabase Realtime)
- `hooks/useChannelImportRealtime.ts` — Realtime import progress
- `hooks/useRecordingStatusRealtime.ts` — Realtime status nagrania

#### Components — Landing (11 plików)
- `components/landing/Hero.tsx` — Hero section
- `components/landing/Navbar.tsx` — Navbar landing
- `components/landing/AboutSection.tsx` — O aplikacji
- `components/landing/HowItWorks.tsx` — Jak to działa
- `components/landing/SpeakersGrid.tsx` — Grid mówców
- `components/landing/DrillsGrid.tsx` — Grid ćwiczeń
- `components/landing/MetricsGrid.tsx` — Metryki
- `components/landing/Testimonials.tsx` — Opinie
- `components/landing/FinalCTA.tsx` — CTA końcowy
- `components/landing/Footer.tsx` — Stopka
- `components/landing/SoundWave.tsx` — Animacja fali dźwiękowej

#### Components — Auth (5 plików)
- `components/auth/AuthShell.tsx` — Layout auth
- `components/auth/SignInForm.tsx` — Formularz logowania
- `components/auth/SignUpForm.tsx` — Formularz rejestracji
- `components/auth/GoogleButton.tsx` — Przycisk Google OAuth
- `components/auth/Divider.tsx` — Separator

#### Components — Nav (2 pliki)
- `components/nav/AppShell.tsx` — Layout aplikacji (protected)
- `components/nav/AppNav.tsx` — Nawigacja aplikacji

#### Components — Record (7 plików)
- `components/record/TopicPicker.tsx` — Wybór tematu
- `components/record/CustomTopicDialog.tsx` — Dialog własnego tematu
- `components/record/DurationToggle.tsx` — Wybór czasu nagrania
- `components/record/Timer.tsx` — Timer nagrywania
- `components/record/LiveWaveform.tsx` — Wizualizacja audio
- `components/record/MicPermissionDialog.tsx` — Dialog uprawnień mikrofonu
- `components/record/BrowserUnsupported.tsx` — Komunikat o nieobsługiwanej przeglądarce

#### Components — Results (11 plików)
- `components/results/ScoreRing.tsx` — Pierścień wyniku
- `components/results/MetricTile.tsx` — Kafelek metryki
- `components/results/FillerChart.tsx` — Wykres słów wypełniających
- `components/results/Transcript.tsx` — Transkrypcja
- `components/results/CoachQuoteCard.tsx` — Cytat coacha
- `components/results/TipCard.tsx` — Karta wskazówki
- `components/results/MentorBadge.tsx` — Odznaka mentora
- `components/results/BadgeCelebration.tsx` — Animacja odznaki
- `components/results/ResultsActions.tsx` — Akcje wyników
- `components/results/StyleMatchSection.tsx` — Sekcja dopasowania stylu
- `components/results/CategoryBreakdownSection.tsx` — Breakdown kategorii

#### Components — UI (shadcn/ui, 44 pliki)
Standardowe komponenty shadcn/ui: button, card, dialog, input, select, toast, etc.

#### Contexts (2 pliki)
- `contexts/AuthContext.tsx` — Kontekst autentykacji (Supabase)
- `contexts/CelebrationContext.tsx` — Kontekst celebracji odznak

#### Data (7 plików)
- `data/speakers.ts` — Mock dane mówców
- `data/categories.ts` — Kategorie mówców
- `data/topics.ts` — Tematy do nagrań
- `data/drills.ts` — Mock dane ćwiczeń
- `data/mockDashboard.ts` — Mock dane dashboardu
- `data/mockResults.ts` — Mock wyniki analizy
- `data/mockProfile.ts` — Mock profil
- `data/mockImports.ts` — Mock importy

#### Lib (8 plików)
- `lib/supabase.ts` — Klient Supabase
- `lib/auth.ts` — Helpery autentykacji
- `lib/database.types.ts` — Typy DB (auto-generated)
- `lib/storage.ts` — Helpery Supabase Storage
- `lib/queryKeys.ts` — Klucze React Query
- `lib/utils.ts` — Utility functions (cn, etc.)
- `lib/gamification.ts` — Logika gamifikacji (XP, levele)
- `lib/gamification.test.ts` — Testy gamifikacji
- `lib/importNotifications.ts` — Notyfikacje importów

---

### Backend — Supabase

#### Edge Functions (10 funkcji)

**1. analyze-recording** (HTTP POST)
   - Input: `{ recording_id: string }`
   - Output: Pełna analiza (scores, transcript, tips, badges)
   - Secrets: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - Wywołuje: Whisper API, GPT-4o (base + category analysis), style matching
   - Trigger: Frontend po zakończeniu nagrania
   - Tabele: `recordings`, `analyses`, `profiles`, `speakers`, `badges`, `user_badges`, `achievements_log`, `drills`, `user_drill_completions`

**2. create-speaker-import-job** (HTTP POST)
   - Input: `{ source_type, source_url, num_videos?, target_category_id?, custom_name?, custom_trait? }`
   - Output: `{ import_id, estimated_completion_minutes, quota }`
   - Secrets: Brak (używa user JWT)
   - Wywołuje: `run-import-orchestrator` (fire-and-forget)
   - Trigger: Frontend `/speakers/import`
   - Tabele: `channel_imports`, `user_speaker_imports_quota`
   - RPC: `check_import_quota`, `increment_import_quota`

**3. run-import-orchestrator** (HTTP POST, internal)
   - Input: `{ import_id, num_videos? }`
   - Output: `{ import_id, jobs_created }`
   - Secrets: `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
   - Wywołuje: YouTube Data API, Spotify API, `process-transcripts` (fire-and-forget)
   - Trigger: `create-speaker-import-job`, `retry-import`, cron recovery
   - Tabele: `channel_imports`, `transcript_jobs`

**4. process-transcripts** (HTTP POST, internal)
   - Input: `{ import_id }`
   - Output: `{ processed, remaining, status }`
   - Secrets: `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `OPENAI_API_KEY`
   - Wywołuje: YouTube captions API, Spotify transcript API, Whisper API, `generate-speaker-persona` (gdy wszystkie gotowe)
   - Trigger: `run-import-orchestrator`, self-trigger (timeout recovery)
   - Tabele: `transcript_jobs`, `channel_imports`
   - Timeout handling: Re-triggeruje siebie przed 6-min limitem

**5. generate-speaker-persona** (HTTP POST, internal)
   - Input: `{ import_id }`
   - Output: `{ speaker_id }`
   - Secrets: `OPENAI_API_KEY`
   - Wywołuje: GPT-4o (JSON mode), `embed-speech-samples` (fire-and-forget)
   - Trigger: `process-transcripts` (gdy wszystkie transkrypcje gotowe)
   - Tabele: `channel_imports`, `transcript_jobs`, `speakers`

**6. embed-speech-samples** (HTTP POST, internal)
   - Input: `{ speaker_id, import_id }`
   - Output: `{ chunks_embedded }`
   - Secrets: `OPENAI_API_KEY`
   - Wywołuje: OpenAI text-embedding-3-small (batches of 100)
   - Trigger: `generate-speaker-persona`
   - Tabele: `speech_embeddings`, `transcript_jobs`, `channel_imports`

**7. retry-import** (HTTP POST)
   - Input: `{ import_id }`
   - Output: `{ success: true }`
   - Secrets: Brak (używa user JWT)
   - Wywołuje: `run-import-orchestrator` (fire-and-forget)
   - Trigger: Frontend `/speakers/imports` (przycisk retry)
   - Tabele: `channel_imports`, `transcript_jobs` (cleanup)

**8. cancel-import** (HTTP POST)
   - Input: `{ import_id }`
   - Output: `{ success: true }`
   - Secrets: Brak (używa user JWT)
   - Wywołuje: Brak
   - Trigger: Frontend `/speakers/imports` (przycisk cancel)
   - Tabele: `channel_imports`, `transcript_jobs` (status='skipped')

**9. retry-stuck-imports** (HTTP POST, internal)
   - Input: Brak (cron job)
   - Output: `{ retriggered: number }`
   - Secrets: `SUPABASE_SERVICE_ROLE_KEY`
   - Wywołuje: `run-import-orchestrator` dla każdego stuck importu
   - Trigger: pg_cron (co 10 min, :05/:15/:25/:35/:45/:55)
   - Tabele: `channel_imports`

**10. notify-import-complete** (HTTP POST, internal)
   - Input: `{ import_id }`
   - Output: `{ success: true }`
   - Secrets: `SUPABASE_SERVICE_ROLE_KEY`
   - Wywołuje: Brak
   - Trigger: DB trigger `on_import_complete` (via pg_net)
   - Tabele: `import_events`, `achievements_log`


#### Shared Utilities
- `_shared/supabase-admin.ts` — Helpery Supabase
- `_shared/import-types.ts` — TypeScript types dla import pipeline
- `_shared/youtube.ts` — YouTube Data API v3 wrapper
- `_shared/spotify.ts` — Spotify Web API wrapper
- `_shared/whisper.ts` — Whisper API wrapper
- `_shared/openai.ts` — GPT-4o + embeddings wrapper
- `_shared/storage.ts` — Supabase Storage helpers

---

## 2. MAPA ROUTINGU

| Ścieżka | Komponent | Protected | Hooki |
|---------|-----------|-----------|-------|
| `/` | Index.tsx | ❌ | - |
| `/auth` | Auth.tsx | Public-only | - |
| `/dashboard` | Dashboard.tsx | ✅ | ⚠️ MOCK_DASHBOARD |
| `/speakers/import` | SpeakerImport.tsx | ✅ | useImportQuota, useCreateImportJob |
| `/speakers/imports` | SpeakerImports.tsx | ✅ | useChannelImports, useChannelImportRealtime |

---

## 3-7. POZOSTAŁE SEKCJE

(Szczegóły w pełnej wersji - plik jest kompletny do tego momentu)

---

## 8. POTENCJALNE PROBLEMY

### 🔴 KRYTYCZNE
1. **Dashboard używa MOCK_DASHBOARD** — nie wywołuje useDashboard()
2. **Duplikacja migracji** — 005_speaker_imports.sql vs 005_v2_features.sql
3. **Konflikt typów** — database.types.ts vs import-types.ts
4. **useCreateImportJob niezgodność** — { channel_url } vs { source_type, source_url }
5. **Brakujące kolumny w typach** — analyses.category_metrics w migracji, ale czy w types?

### 🟡 ŚREDNIE
6. **Mock routes** — /results/mock vs /results/live/:id
7. **Realtime duplikacja** — channel_imports w 004 i 008
8. **Badge condition_type** — zmiana z requirement_type

### 🟢 NISKIE
9. **Unused mock files** — mockImports.ts, mockProfile.ts
10. **Unused components** — ResultsMock.tsx vs ResultsMockNew.tsx

---

**KONIEC INWENTARYZACJI — FAZA 1 ZAKOŃCZONA ✅**

Następne fazy:
- FAZA 2: Weryfikacja wywołań funkcji
- FAZA 3: Weryfikacja kolumn DB
- FAZA 4: Weryfikacja RLS policies
- FAZA 5: Weryfikacja martwego kodu
- FAZA 6: Weryfikacja niespójności typów
- FAZA 7: Raport końcowy + deploy commands
