#!/bin/bash
SUPABASE_URL="https://hthjuoswarvsfssxqxxj.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aGp1b3N3YXJ2c2Zzc3hxeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODkzNTIsImV4cCI6MjA5MjE2NTM1Mn0.DPfKl9RqLWPQNXqsA-QC8kBBa3Qh7pw60NLdwiq-eOc"

echo "=== SPRAWDZAM STAN BAZY DANYCH ==="
echo ""

# Sprawdź wszystkie tabele
echo "[1] Lista wszystkich tabel:"
curl -s "$SUPABASE_URL/rest/v1/rpc/pg_tables" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" 2>/dev/null || echo "Brak dostępu do pg_tables"

# Alternatywnie - sprawdź konkretne tabele
echo ""
echo "[2] Sprawdzam konkretne tabele:"
for table in profiles speakers drills recordings analyses badges achievements_log channel_imports; do
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$SUPABASE_URL/rest/v1/$table?select=count&limit=0" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" \
    -H "Prefer: count=exact")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✓ $table - istnieje"
  else
    echo "  ✗ $table - nie istnieje (HTTP $HTTP_CODE)"
  fi
done

echo ""
echo "[3] Sprawdzam storage buckets:"
curl -s "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" | head -10

