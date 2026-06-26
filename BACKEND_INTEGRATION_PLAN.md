# PLAN INTEGRACJI BACKENDU — USUNIĘCIE MOCK DANYCH

**Data:** 2026-04-25  
**Cel:** Podpięcie wszystkich komponentów do Supabase i usunięcie mock danych

═══════════════════════════════════════════════════════════════
## STAN OBECNY
═══════════════════════════════════════════════════════════════

### Backend (✅ GOTOWY)
- 34 migracje zaaplikowane
- 25 tabel w bazie
- 9 RPC functions
- 16 Edge Functions wdrożone
- 6 kategorii mentorów z pełnymi danymi
- 20 mentorów, 30 drills, 16 badges, 30 topics

### Frontend (⚠️ UŻYWA MOCK DANYCH)
- 23 hooki do Supabase (już istnieją w src/hooks/queries/)
- 9 stron używa MOCK_ danych
- 14 plików mock w src/data/

### Pliki mock do usunięcia:
```
src/data/mockConversation.ts
src/data/mockDashboard.ts
src/data/mockGoals.ts
src/data/mockImports.ts
src/data/mockOwnChannel.ts
src/data/mockProfile.ts
src/data/mockProgress.ts
src/data/mockRecords.ts
src/data/mockResults.ts
src/data/mockReviews.ts
```

### Strony używające mock:
```
src/pages/Dashboard.tsx
src/pages/Progress.tsx
src/pages/Profile.tsx
src/pages/Reviews.tsx
src/pages/Records.tsx
src/pages/ConversationsLibrary.tsx
src/pages/MyChannel.tsx
src/pages/MyChannelVideo.tsx
src/pages/SpeakerImports.tsx
```

═══════════════════════════════════════════════════════════════
## STRATEGIA INTEGRACJI
═══════════════════════════════════════════════════════════════

### Faza 1: Weryfikacja hooków Supabase
Sprawdzić które hooki już istnieją i działają:
- ✅ useDashboardStats (RPC: get_dashboard_stats)
- ✅ useProgressChartData (RPC: get_progress_chart)
- ✅ useProfile
- ✅ useBadges
- ✅ useRecentRecordings
- ✅ useSpeakerCategories
- ✅ useChannelImports
- ⚠️ useGoals (nowy hook)
- ⚠️ usePersonalRecords (nowy hook)
- ⚠️ useConversations (nowy hook)
- ⚠️ useWeeklyReviews (nowy hook)

### Faza 2: Podpięcie komponentów (strona po stronie)

**2.1 Dashboard.tsx**
- Zamienić `MOCK_DASHBOARD` na hooki:
  - `useDashboardStats()` — stats, level, xp
  - `useProfile()` — user name, mentor
  - `useBadges()` — badges
  - `useDailyDrill()` — daily drill
  - `useRecentRecordings()` — recent sessions
  - `useProgressChartData()` — trajectory chart
- Usunąć import z `@/data/mockDashboard`

**2.2 Progress.tsx**
- Zamienić `MOCK_PROGRESS` na:
  - `useGoals()` — active goals
  - `usePersonalRecords()` — personal bests
  - `useActivityHeatmap()` — activity heatmap
  - `useSkillMetrics()` — skill radar
- Usunąć import z `@/data/mockProgress`

**2.3 Profile.tsx**
- Zamienić `MOCK_PROFILE` na:
  - `useProfile()` — profile data
  - `useUpdateProfile()` — mutation
- Usunąć import z `@/data/mockProfile`

**2.4 Reviews.tsx**
- Zamienić `MOCK_REVIEWS` na:
  - `useWeeklyReviews()` — weekly reviews
- Usunąć import z `@/data/mockReviews`

**2.5 Records.tsx**
- Zamienić `MOCK_RECORDS` na:
  - `usePersonalRecords()` — personal records
- Usunąć import z `@/data/mockRecords`

**2.6 ConversationsLibrary.tsx**
- Zamienić `MOCK_CONVERSATION` na:
  - `useConversations()` — conversations list
  - `useConversationResults()` — conversation details
- Usunąć import z `@/data/mockConversation`

**2.7 MyChannel.tsx + MyChannelVideo.tsx**
- Zamienić `MOCK_OWN_CHANNEL` na:
  - `useMyImportedSpeakers()` — imported speakers
  - `useChannelImports()` — import status
- Usunąć import z `@/data/mockOwnChannel`

**2.8 SpeakerImports.tsx**
- Zamienić `MOCK_IMPORTS` na:
  - `useChannelImports()` — imports list
  - `useImportQuota()` — quota
- Usunąć import z `@/data/mockImports`

### Faza 3: Usunięcie plików mock
Po podpięciu wszystkich komponentów:
```bash
rm src/data/mockConversation.ts
rm src/data/mockDashboard.ts
rm src/data/mockGoals.ts
rm src/data/mockImports.ts
rm src/data/mockOwnChannel.ts
rm src/data/mockProfile.ts
rm src/data/mockProgress.ts
rm src/data/mockRecords.ts
rm src/data/mockResults.ts
rm src/data/mockReviews.ts
```

Zachować:
- `src/data/categories.ts` — statyczne dane kategorii
- `src/data/drills.ts` — statyczne dane ćwiczeń
- `src/data/speakers.ts` — statyczne dane mentorów
- `src/data/topics.ts` — statyczne tematy

### Faza 4: Weryfikacja
- Build bez błędów: `npm run build`
- Sprawdzić każdą stronę w przeglądarce
- Zweryfikować że dane ładują się z Supabase

═══════════════════════════════════════════════════════════════
## KOLEJNOŚĆ WYKONANIA
═══════════════════════════════════════════════════════════════

1. ✅ Weryfikacja hooków (sprawdzić które już istnieją)
2. 🔄 Dashboard.tsx (najprostsza strona, najwięcej hooków już gotowych)
3. 🔄 Profile.tsx (prosty hook useProfile)
4. 🔄 Progress.tsx (wymaga nowych hooków: useGoals, usePersonalRecords)
5. 🔄 Records.tsx (używa usePersonalRecords z #4)
6. 🔄 Reviews.tsx (wymaga nowego hooka: useWeeklyReviews)
7. 🔄 ConversationsLibrary.tsx (wymaga hooków: useConversations, useConversationResults)
8. 🔄 MyChannel.tsx + MyChannelVideo.tsx (hooki już istnieją)
9. 🔄 SpeakerImports.tsx (hooki już istnieją)
10. 🔄 Usunięcie plików mock
11. 🔄 Build + weryfikacja

═══════════════════════════════════════════════════════════════
## UWAGI TECHNICZNE
═══════════════════════════════════════════════════════════════

### Hooki które już istnieją (23):
- useSession, useProfile, useUpdateProfile
- useRecentRecordings, useRecording
- useDashboardStats, useProgressChartData
- useSpeakers, useSpeaker
- useDrills, useDrill, useDailyDrill
- useBadges
- useAchievementsTimeline
- useSpeakerCategories, useSpeakersByCategory
- useMyImportedSpeakers, useImportQuota
- useChannelImports, useChannelImport
- useResults

### Hooki do utworzenia (6):
- useGoals (user_goals table)
- usePersonalRecords (personal_records table)
- useConversations (conversations table)
- useConversationResults (conversation_results table)
- useWeeklyReviews (weekly_reviews table)
- useSkillMetrics (z analyses table)

### RPC functions dostępne:
- get_dashboard_stats
- get_progress_chart
- get_daily_drill
- check_import_quota
- increment_import_quota
- increment_profile_xp
- handle_new_user
- copy_mentor_persona_snapshot
- get_user_import_count

═══════════════════════════════════════════════════════════════
## NASTĘPNY KROK
═══════════════════════════════════════════════════════════════

Zacznij od weryfikacji istniejących hooków i podpięcia Dashboard.tsx.
