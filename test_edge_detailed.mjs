import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunctions() {
  console.log('\n=== TEST EDGE FUNCTIONS - SZCZEGÓŁY ===\n');
  
  const functions = [
    { name: 'analyze-recording', body: { recording_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'create-speaker-import-job', body: { source_type: 'youtube_channel', source_url: 'https://www.youtube.com/@test', num_videos: 1 } },
    { name: 'cancel-import', body: { import_id: '00000000-0000-0000-0000-000000000000' } }
  ];
  
  for (const fn of functions) {
    try {
      const { data, error } = await supabase.functions.invoke(fn.name, { body: fn.body });
      
      if (error) {
        console.log(`\n❌ ${fn.name}:`);
        console.log(`   Status: ${error.status || 'unknown'}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Context: ${JSON.stringify(error.context || {})}`);
      } else {
        console.log(`\n✅ ${fn.name}: SUCCESS`);
        console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`\n💥 ${fn.name}: EXCEPTION`);
      console.log(`   ${e.message}`);
    }
  }
}

testEdgeFunctions().catch(console.error);
