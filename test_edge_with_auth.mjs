import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Brak zmiennych środowiskowych VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithAuth() {
  console.log('\n=== TEST Z AUTORYZACJĄ ===\n');

  // Najpierw zaloguj się (użyj swoich danych testowych)
  const email = process.argv[2] || 'test@example.com'; // Podaj email jako argument
  const password = process.argv[3] || 'testpassword123'; // Podaj hasło jako argument

  console.log('Logowanie...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error('❌ Błąd logowania:', authError.message);
    console.log('\nUtwórz użytkownika testowego w Supabase Dashboard:');
    console.log('Authentication → Users → Add user');
    return;
  }

  console.log('✅ Zalogowano jako:', authData.user.email);
  console.log('User ID:', authData.user.id);

  // Teraz wywołaj funkcję Edge
  console.log('\n--- Wywołanie create-speaker-import-job ---\n');

  const { data, error } = await supabase.functions.invoke('create-speaker-import-job', {
    body: {
      source_type: 'youtube_channel',
      source_url: 'https://www.youtube.com/@TEDTalks',
      num_videos: 5
    }
  });

  if (error) {
    console.error('❌ Błąd funkcji Edge:');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Context:', JSON.stringify(error.context, null, 2));

    // Spróbuj wywołać bezpośrednio przez fetch, aby zobaczyć pełną odpowiedź
    console.log('\n--- Próba bezpośredniego wywołania przez fetch ---\n');

    const response = await fetch(`${supabaseUrl}/functions/v1/create-speaker-import-job`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_type: 'youtube_channel',
        source_url: 'https://www.youtube.com/@TEDTalks',
        num_videos: 5
      })
    });

    console.log('Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response body:', text);

  } else {
    console.log('✅ Sukces!');
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

testWithAuth().catch(console.error);
