#!/bin/bash
SUPABASE_URL="https://hthjuoswarvsfssxqxxj.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aGp1b3N3YXJ2c2Zzc3hxeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODkzNTIsImV4cCI6MjA5MjE2NTM1Mn0.DPfKl9RqLWPQNXqsA-QC8kBBa3Qh7pw60NLdwiq-eOc"

echo "=== SPRAWDZAM WSZYSTKIE TABELE Z MIGRACJI ==="
echo ""

# Lista tabel do sprawdzenia (z migracji)
TABLES=(
  "profiles"
  "speakers"
  "drills"
  "recordings"
  "analyses"
  "badges"
  "achievements_log"
  "channel_imports"
  "weekly_reviews"
  "daily_insights"
  "stagnation_alerts"
  "conversation_results"
  "speech_embeddings"
  "import_transcripts"
  "import_events"
  "user_quotas"
)

for table in "${TABLES[@]}"; do
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$SUPABASE_URL/rest/v1/$table?select=count&limit=0" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" \
    -H "Prefer: count=exact" 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ $table"
  else
    echo "✗ $table (HTTP $HTTP_CODE)"
  fi
done
