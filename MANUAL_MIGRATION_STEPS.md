# KROKI RĘCZNEJ MIGRACJI - BIG SPEAKING

## Status obecny
- ✅ Edge functions: 16/16 wdrożone
- ✅ Tabele: 11/16 istnieją
- ❌ Storage bucket `recordings`: NIE ISTNIEJE (KRYTYCZNE)
- ❌ RPC functions: NIE ISTNIEJĄ (dashboard nie działa)
- ❌ Seed data: BRAK (aplikacja pusta)

## PRIORYTET 1: Storage Bucket (5 min) - KRYTYCZNE

### Otwórz SQL Editor:
https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql/new

### Skopiuj i uruchom całą zawartość:
`supabase/migrations/023_storage_layer.sql`

**Weryfikacja:**
```bash
curl "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $ANON_KEY" | grep recordings
```

---

## PRIORYTET 2: RPC Functions (10 min) - WYSOKIE

### Otwórz SQL Editor:
https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql/new

### Skopiuj i uruchom całą zawartość:
`supabase/migrations/002_rpc_functions.sql`

**Weryfikacja:**
```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_dashboard_stats" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## PRIORYTET 3: Seed Data (5 min) - ŚREDNIE

### Otwórz SQL Editor:
https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql/new

### Skopiuj i uruchom całą zawartość:
`supabase/migrations/022_seed_data.sql`

**Weryfikacja:**
```bash
curl "$SUPABASE_URL/rest/v1/speakers?select=name&limit=3" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## OPCJONALNIE: Brakujące tabele (15 min)

### 1. conversation_results
Skopiuj i uruchom: `supabase/migrations/029_conversation_results.sql`

### 2. import_events
Skopiuj i uruchom: `supabase/migrations/027_import_reliability.sql`

---

## Po zakończeniu uruchom:
```bash
./final_verification.sh
```

Wszystkie testy powinny zwrócić ✓
