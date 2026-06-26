import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunctions() {
  console.log('\n=== TEST EDGE FUNCTIONS (bez auth) ===\n');
  
  // Test analyze-recording (wymaga auth)
  const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('analyze-recording', {
    body: { recording_id: '00000000-0000-0000-0000-000000000000' }
  });
  console.log(`analyze-recording: ${analyzeError ? '❌ ' + analyzeError.message : '✅ odpowiedział'}`);
  
  // Test create-speaker-import-job (wymaga auth)
  const { data: importData, error: importError } = await supabase.functions.invoke('create-speaker-import-job', {
    body: { 
      source_type: 'youtube_channel',
      source_url: 'https://www.youtube.com/@test',
      num_videos: 1
    }
  });
  console.log(`create-speaker-import-job: ${importError ? '❌ ' + importError.message : '✅ odpowiedział'}`);
  
  // Test cancel-import (wymaga auth)
  const { data: cancelData, error: cancelError } = await supabase.functions.invoke('cancel-import', {
    body: { import_id: '00000000-0000-0000-0000-000000000000' }
  });
  console.log(`cancel-import: ${cancelError ? '❌ ' + cancelError.message : '✅ odpowiedział'}`);
}

testEdgeFunctions().catch(console.error);
