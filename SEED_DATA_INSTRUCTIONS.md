# INSTRUKCJE APLIKOWANIA SEED DATA

## Problem
Tabele `speakers`, `drills`, `badges`, `random_topics` są puste (0 wierszy).
Dane seed istnieją w migracji `003_seed_complete.sql`, ale nie zostały zaaplikowane.

## Rozwiązanie: Ręczne zaaplikowanie przez Supabase Dashboard

### Krok 1: Otwórz Supabase Dashboard
1. Przejdź do https://supabase.com/dashboard
2. Wybierz swój projekt
3. Przejdź do **SQL Editor** (lewa sidebar)

### Krok 2: Zaaplikuj seed data
1. Kliknij **New query**
2. Skopiuj całą zawartość pliku `supabase/migrations/003_seed_complete.sql`
3. Wklej do SQL Editor
4. Kliknij **Run** (lub Ctrl+Enter)

### Krok 3: Weryfikacja
Wykonaj to query w SQL Editor:

```sql
SELECT 'speakers' as table_name, COUNT(*) as count FROM speakers
UNION ALL SELECT 'drills', COUNT(*) FROM drills
UNION ALL SELECT 'badges', COUNT(*) FROM badges
UNION ALL SELECT 'random_topics', COUNT(*) FROM random_topics;
```

**Oczekiwany rezultat:**
- speakers: 10
- drills: ~20-30
- badges: ~10-15
- random_topics: ~50+

## Alternatywne rozwiązanie: Przez Supabase CLI (wymaga PostgreSQL)

Jeśli masz zainstalowany PostgreSQL z `psql`:

```bash
# Pobierz connection string
DB_URL=$(supabase db remote-config get db_url)

# Zaaplikuj seed
psql "$DB_URL" -f supabase/migrations/003_seed_complete.sql

# Weryfikuj
psql "$DB_URL" -c "SELECT 'speakers' as table_name, COUNT(*) FROM speakers UNION ALL SELECT 'drills', COUNT(*) FROM drills;"
```

## Co zawiera seed data?

### Speakers (10):
- Steve Jobs
- Barack Obama
- Martin Luther King Jr.
- Tony Robbins
- Brené Brown
- Simon Sinek
- Oprah Winfrey
- Malcolm Gladwell
- Sheryl Sandberg
- Gary Vaynerchuk

### Drills (~20-30):
- Tongue twisters
- Pitch exercises
- Storytelling prompts
- Pacing drills
- Vocabulary builders

### Badges (~10-15):
- Achievement badges
- Milestone badges
- Skill badges

### Random Topics (~50+):
- Losowe tematy do ćwiczeń mówienia

## Po zaaplikowaniu seed data

Backend będzie w pełni funkcjonalny:
- ✅ Użytkownicy będą mogli wybierać mentorów
- ✅ Ćwiczenia będą dostępne
- ✅ Odznaki będą przyznawane
- ✅ Losowe tematy będą generowane

## Następny krok: Test end-to-end

Po zaaplikowaniu seed data:
1. Uruchom frontend: `npm run dev`
2. Zaloguj się jako test user
3. Nagraj 30s sesję
4. Sprawdź czy wyniki się pokazują
5. Sprawdź w Supabase Dashboard czy wiersze w `analyses` się tworzą
