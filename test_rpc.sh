#!/bin/bash
SUPABASE_URL="https://hthjuoswarvsfssxqxxj.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aGp1b3N3YXJ2c2Zzc3hxeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODkzNTIsImV4cCI6MjA5MjE2NTM1Mn0.DPfKl9RqLWPQNXqsA-QC8kBBa3Qh7pw60NLdwiq-eOc"

echo "=== TEST RPC FUNCTIONS ==="

# Test get_dashboard_stats (bez user_id - sprawdzamy czy funkcja istnieje)
echo "[TEST] get_dashboard_stats..."
curl -s "$SUPABASE_URL/rest/v1/rpc/get_dashboard_stats" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | head -5
echo ""

# Test get_daily_drill
echo "[TEST] get_daily_drill..."
curl -s "$SUPABASE_URL/rest/v1/rpc/get_daily_drill" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | head -5
echo ""

# Lista wszystkich dostępnych RPC
echo "[TEST] Lista dostępnych funkcji RPC..."
curl -s "$SUPABASE_URL/rest/v1/" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" | grep -o '"[^"]*"' | grep -v "http" | head -20
