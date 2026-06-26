import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log('=== SPRAWDZANIE TABEL (przez bezpośredni dostęp) ===\n');
  const tables = [
    'profiles', 'speakers', 'recordings', 'conversation_results',
    'drills', 'badges', 'channel_imports', 'weekly_reviews',
    'analyses', 'user_badges', 'transcript_jobs', 'speech_embeddings'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`✅ ${table.padEnd(25)} ${count} wierszy`);
    } else {
      console.log(`❌ ${table.padEnd(25)} ${error.message}`);
    }
  }
  
  console.log('\n=== SPRAWDZANIE RPC FUNCTIONS ===\n');
  
  // Test get_dashboard_stats (wymaga user_id)
  const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', {
    p_user_id: '00000000-0000-0000-0000-000000000000' // dummy UUID
  });
  console.log(`get_dashboard_stats: ${statsError ? '❌ ' + statsError.message : '✅ działa'}`);
  
  // Test get_daily_drill
  const { data: drillData, error: drillError } = await supabase.rpc('get_daily_drill', {
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log(`get_daily_drill: ${drillError ? '❌ ' + drillError.message : '✅ działa'}`);
  
  console.log('\n=== SPRAWDZANIE STORAGE BUCKETS ===\n');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (!bucketsError && buckets) {
    buckets.forEach(b => console.log(`✅ Bucket: ${b.name} (public: ${b.public})`));
  } else {
    console.log(`❌ Błąd: ${bucketsError?.message}`);
  }
}

runQueries().catch(console.error);
