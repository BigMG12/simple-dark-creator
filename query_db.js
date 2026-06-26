const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log('=== TABELE ===');
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  });
  
  if (tablesError) {
    // Próba bezpośredniego dostępu
    console.log('Sprawdzam dostępne tabele przez metadata...');
    const checks = [
      'profiles', 'speakers', 'recordings', 'conversation_results',
      'drills', 'badges', 'channel_imports', 'weekly_reviews'
    ];
    
    for (const table of checks) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (!error) {
        console.log(`✅ ${table}: ${count} wierszy`);
      } else {
        console.log(`❌ ${table}: ${error.message}`);
      }
    }
  } else {
    console.log(tables);
  }
  
  console.log('\n=== RPC FUNCTIONS ===');
  const rpcs = ['get_dashboard_stats', 'get_progress_chart', 'get_daily_drill'];
  for (const rpc of rpcs) {
    console.log(`Sprawdzam: ${rpc}`);
  }
}

runQueries().catch(console.error);
