# DEBUG: Import YouTube Channel Issue

## Problem
Edge function `create-speaker-import-job` zwraca błąd "non-2xx status code" bez szczegółów.

## Kroki debugowania

### 1. Sprawdź strukturę tabeli channel_imports w Supabase Dashboard

Wykonaj w SQL Editor:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'channel_imports'
ORDER BY ordinal_position;
```

**Oczekiwane kolumny:**
- id (UUID)
- user_id (UUID)
- source_type (TEXT) - MUSI ISTNIEĆ
- source_url (TEXT) - MUSI ISTNIEĆ
- status (TEXT)
- progress (INTEGER lub podobne)
- error_message (TEXT)
- custom_name (TEXT)
- custom_trait (TEXT)
- target_category_id (TEXT lub UUID)
- created_at (TIMESTAMPTZ)

### 2. Sprawdź logi edge function

W terminalu:
```bash
# Nie działa w CLI - trzeba przez Dashboard
# Supabase Dashboard → Edge Functions → create-speaker-import-job → Logs
```

### 3. Test ręczny edge function

Wykonaj w Supabase Dashboard → Edge Functions → create-speaker-import-job → Invoke:

```json
{
  "source_type": "youtube_channel",
  "source_url": "https://www.youtube.com/@TEDTalks",
  "num_videos": 20
}
```

### 4. Sprawdź RPC functions

```sql
-- Sprawdź czy funkcja check_import_quota istnieje
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'check_import_quota';

-- Sprawdź czy funkcja increment_import_quota istnieje
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'increment_import_quota';
```

### 5. Sprawdź czy tabela user_speaker_imports_quota istnieje

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_speaker_imports_quota'
) as quota_table_exists;
```

## Możliwe przyczyny błędu

1. **Brak kolumny source_type w channel_imports** - edge function próbuje wstawić do nieistniejącej kolumny
2. **Brak RPC function check_import_quota** - edge function wywołuje nieistniejącą funkcję
3. **Brak tabeli user_speaker_imports_quota** - RPC function nie może sprawdzić limitu
4. **Niezgodność struktury** - kolumny mają inne nazwy niż oczekuje edge function

## Rozwiązanie

Po zidentyfikowaniu problemu:

### Jeśli brakuje kolumny source_type:
```sql
ALTER TABLE public.channel_imports 
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'youtube_channel'
CHECK (source_type IN ('youtube_channel','youtube_video','rumble','spotify','upload'));
```

### Jeśli brakuje RPC functions:
Uruchom migrację `008_quota_tier_helpers.sql` w Supabase Dashboard.

### Jeśli brakuje tabeli quota:
Uruchom migrację która tworzy `user_speaker_imports_quota`.
