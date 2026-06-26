#!/bin/bash
SUPABASE_URL="https://hthjuoswarvsfssxqxxj.supabase.co"

echo "=== BACKEND REALITY CHECK ==="
echo ""
echo "1. Sprawdzam dostępność Supabase..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$SUPABASE_URL/rest/v1/" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aGp1b3N3YXJ2c2Zzc3hxeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODkzNTIsImV4cCI6MjA5MjE2NTM1Mn0.DPfKl9RqLWPQNXqsA-QC8kBBa3Qh7pw60NLdwiq-eOc"

echo ""
echo "2. Sprawdzam tabele w bazie (via REST API)..."
curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aGp1b3N3YXJ2c2Zzc3hxeHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODkzNTIsImV4cCI6MjA5MjE2NTM1Mn0.DPfKl9RqLWPQNXqsA-QC8kBBa3Qh7pw60NLdwiq-eOc" | head -20

echo ""
echo "3. Test edge function analyze-recording (bez auth - oczekujemy 401)..."
curl -s -X POST "$SUPABASE_URL/functions/v1/analyze-recording" \
  -H "Content-Type: application/json" \
  -d '{"recording_id":"test"}' | head -5

echo ""
echo "=== KONIEC TESTU ==="
