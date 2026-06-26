#!/bin/bash
SUPABASE_URL="https://hthjuoswarvsfssxqxxj.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aGp1b3N3YXJ2c2Zzc3hxeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODkzNTIsImV4cCI6MjA5MjE2NTM1Mn0.DPfKl9RqLWPQNXqsA-QC8kBBa3Qh7pw60NLdwiq-eOc"

echo "=== TEST CRON JOBS ==="
echo ""

# Test 1: Sprawdź czy tabela cron.job istnieje
echo "[TEST 1] Sprawdzam cron.job..."
curl -s "$SUPABASE_URL/rest/v1/rpc/cron_job" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" 2>&1 | head -5
echo ""

# Test 2: Sprawdź tabele związane z weekly_reviews
echo "[TEST 2] Sprawdzam tabelę weekly_reviews..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$SUPABASE_URL/rest/v1/weekly_reviews?select=count&limit=0" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Prefer: count=exact")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Tabela weekly_reviews istnieje"
else
  echo "✗ Tabela weekly_reviews nie istnieje (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Sprawdź daily_insights
echo "[TEST 3] Sprawdzam tabelę daily_insights..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$SUPABASE_URL/rest/v1/daily_insights?select=count&limit=0" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Prefer: count=exact")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Tabela daily_insights istnieje"
else
  echo "✗ Tabela daily_insights nie istnieje (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Sprawdź stagnation_alerts
echo "[TEST 4] Sprawdzam tabelę stagnation_alerts..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$SUPABASE_URL/rest/v1/stagnation_alerts?select=count&limit=0" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Prefer: count=exact")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Tabela stagnation_alerts istnieje"
else
  echo "✗ Tabela stagnation_alerts nie istnieje (HTTP $HTTP_CODE)"
fi

