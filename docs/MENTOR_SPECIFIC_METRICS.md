# Mentor-Specific Metrics System

## Przegląd

System metryk specyficznych dla mentorów rozszerza bazowe 6 metryk (WPM, Filler, Pause, Energy, Clarity, Vocab) o dodatkowe metryki unikalne dla każdej kategorii mentorów. Każdy mentor ma 3-5 custom metryk, na które patrzy pierwszorzędnie podczas oceny użytkownika.

## Architektura

### 1. Schema Database

#### `speaker_categories.primary_metrics_this_mentor_cares_about` (JSONB)

Struktura pojedynczej metryki:
```json
{
  "metric_name": "urgency_density",
  "display_name": "Urgency Density",
  "description": "Ile razy na minutę użytkownik stworzył poczucie pilności/straty/okazji",
  "how_to_score": "Zlicz użycie słów: now, today, limited, only...",
  "ideal_range": [3, 6],
  "weight": 0.35
}
```

#### `analyses.mentor_specific_metrics` (JSONB)

Przechowuje obliczone wartości:
```json
{
  "urgency_density": 4.2,
  "close_attempts": 2,
  "tonality_shifts": 8
}
```

### 2. Computation Pipeline

```
1. Whisper transcription → transcript + word timestamps
2. Raw metrics computation → WPM, fillers, pauses, vocab
3. Mentor-specific metrics → computeMentorSpecificMetrics()
4. AI analysis → GPT feedback
5. Database insert → analyses table
```

## Metryki po Kategoriach

### MOTIVATION (Goggins, Tony Robbins, Les Brown, Eric Thomas, Mel Robbins)

1. **Personal Stakes** (1-4 razy/60s)
   - Ile razy użytkownik ujawnił osobiste konsekwencje
   - Keywords: "I will", "I must", "my life depends", "everything is on the line"

2. **Intensity Peaks** (2-5 razy/min)
   - Momenty maksymalnej intensywności emocjonalnej
   - Wykrzykniki, powtórzenia, wzmocnienia (very, extremely, absolutely)

3. **Confrontation Language** (3-6 razy/min)
   - Bezpośrednie wyzwania rzucone słuchaczowi
   - Keywords: "are you", "why don't you", "what are you waiting for", "stop"

4. **Permission Statements** (1-3 razy/60s)
   - Dawanie pozwolenia na chcenie więcej
   - Keywords: "you can", "you deserve", "it's okay to", "give yourself permission"

### SALES (Belfort, Grant Cardone, Brian Tracy, Zig Ziglar, Johnny Miller)

1. **Urgency Density** (3-6 razy/min) ⭐ WEIGHT: 0.35
   - Tworzenie poczucia pilności/straty/okazji
   - Keywords: "now", "today", "limited", "only", "last chance", "running out"

2. **Close Attempts** (1-3 razy/60s) ⭐ WEIGHT: 0.25
   - Bezpośrednie prośby o decyzję
   - Keywords: "are you ready", "let's do it", "say yes", "commit now"

3. **Tonality Shifts** (5-10 razy/min) ⭐ WEIGHT: 0.20
   - Zmiany tonalności dla podkreślenia pewności
   - Wymaga AI analysis kontekstu

4. **Objection Pre-emption** (1-3 razy/60s) ⭐ WEIGHT: 0.20
   - Proaktywne neutralizowanie obiekcji
   - Keywords: "you might think", "before you ask", "let me address"

### INFLUENCE (Andrew Tate, Chris Voss, Robert Cialdini, Patrick Bet-David, Alex Hormozi)

1. **Authority Signals** (2-4 razy/min) ⭐ WEIGHT: 0.30
   - Budowanie wiarygodności przez credentials/wyniki
   - Keywords: "I have", "my experience", "research proves", "data shows"

2. **Social Proof** (1-3 razy/60s) ⭐ WEIGHT: 0.25
   - Odwołania do zachowań innych jako walidacja
   - Keywords: "others have", "most people", "thousands of", "clients report"

3. **Framework Density** (2-5 razy/min) ⭐ WEIGHT: 0.25
   - Użycie numerowanych systemów i struktur
   - Keywords: "three steps", "five principles", "first/second/third"

4. **Value Equation** (1-3 razy/60s) ⭐ WEIGHT: 0.20
   - Matematyczne/logiczne framowanie wartości
   - Keywords: "if X then Y", "ROI", "cost versus benefit", "compare"

### LEADERSHIP (Obama, MLK, Steve Jobs, Simon Sinek, Jocko Willink, Nelson Mandela)

1. **Gravitas Pauses** (2-4 razy/min) ⭐ WEIGHT: 0.30
   - Dramatyczne pauzy >1.5s przed kluczowymi słowami
   - Wymaga analizy timestampów

2. **We Language** (15-25% zaimków) ⭐ WEIGHT: 0.25
   - Język inkluzywny budujący wspólną tożsamość
   - Keywords: "we", "our", "us", "together", "collective", "shared"

3. **Vision Statements** (1-3 razy/60s) ⭐ WEIGHT: 0.25
   - Konkretne opisy przyszłego stanu
   - Keywords: "imagine", "picture", "future where", "we will", "one day"

4. **Accountability Language** (1-2 razy/60s) ⭐ WEIGHT: 0.20
   - Przyjmowanie osobistej odpowiedzialności
   - Keywords: "I take responsibility", "my fault", "I own this", "on me"

### STORYTELLING (McConaughey, Donald Miller, Brené Brown, Will Smith, Trevor Noah)

1. **Sensory Details** (5-10 razy/min) ⭐ WEIGHT: 0.30
   - Gęstość szczegółów sensorycznych
   - Kolory, dźwięki, zapachy, tekstury, temperatury

2. **Dialogue Usage** (2-4 razy/60s) ⭐ WEIGHT: 0.25
   - Użycie bezpośredniego dialogu w narracji
   - Keywords: "he said", "she told me", "I asked", "they replied"

3. **Emotional Beats** (2-4 razy/min) ⭐ WEIGHT: 0.25
   - Wyraźne zmiany stanu emocjonalnego
   - Wymaga AI analysis: radość→smutek, strach→ulga

4. **Narrative Arc** (70-100/100) ⭐ WEIGHT: 0.20
   - Pełna struktura: setup, conflict, resolution
   - Wymaga AI analysis

### AUTHORITY (Jordan Peterson, Gary Vaynerchuk, Joe Rogan, Lex Fridman, Naval Ravikant)

1. **Credential Signals** (2-4 razy/min) ⭐ WEIGHT: 0.30
   - Sygnały ustanawiające prawo do zajmowania stanowiska
   - Keywords: "research shows", "studies indicate", "documented", "peer-reviewed"

2. **Contrarian Claims** (1-3 razy/60s) ⭐ WEIGHT: 0.25
   - Stanowiska przeciwne mainstreamowi
   - Keywords: "contrary to", "most people think", "actually", "unpopular opinion"

3. **Intellectual Depth** (3-6 razy/min) ⭐ WEIGHT: 0.25
   - Markery głębokiego zaangażowania z złożonością
   - Keywords: "nuanced", "complex", "depends on", "however", "on the other hand"

4. **Thinking Pauses** (2-4 razy/min) ⭐ WEIGHT: 0.20
   - Pauzy >1s sygnalizujące rzeczywiste myślenie
   - Wymaga AI analysis kontekstu

## Implementacja

### Computation Methods

#### 1. Keyword Matching (szybkie, bez AI)
- Regex-based pattern matching
- Frequency counting per minute
- Używane dla większości metryk

```typescript
function computeUrgencyDensity(transcript: string, durationMinutes: number): number {
  const urgencyWords = ["now", "today", "limited", "only", ...];
  let count = 0;
  for (const word of urgencyWords) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = transcript.match(pattern);
    if (matches) count += matches.length;
  }
  return Math.round((count / durationMinutes) * 10) / 10;
}
```

#### 2. Timestamp Analysis (średnio szybkie)
- Analiza Whisper word timestamps
- Detekcja pauz i ich kontekstu
- Używane dla gravitas_pauses, productive_pauses

```typescript
function computeGravitasPauses(words: WhisperWord[], durationMinutes: number): number {
  let gravitasPauseCount = 0;
  for (let i = 1; i < words.length; i++) {
    const pauseDuration = (words[i].start - words[i - 1].end) * 1000;
    if (pauseDuration >= 1500) { // >1.5s
      gravitasPauseCount++;
    }
  }
  return Math.round((gravitasPauseCount / durationMinutes) * 10) / 10;
}
```

#### 3. AI Analysis (wolniejsze, ale dokładniejsze)
- GPT-4o-mini dla oceny jakościowej
- Używane dla: tonality_shifts, intensity_peaks, emotional_beats, narrative_arc
- JSON response format

```typescript
async function computeIntensityPeaks(transcript: string, openaiKey: string): Promise<number> {
  const prompt = `Count intensity peaks in this speech - moments of maximum emotional intensity...`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });
  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return Math.round(parsed.intensity_peaks || 0);
}
```

### Integration Flow

```typescript
// W analyze-recording/index.ts, po Step 6:

// Step 6a: Compute mentor-specific metrics
let mentorSpecificMetrics: Record<string, number> | null = null;

try {
  mentorSpecificMetrics = await computeMentorSpecificMetrics(
    transcript,
    wordTimestamps,
    rawMetrics,
    speaker,
    openaiKey,
  );
} catch (err) {
  console.warn("Mentor-specific metrics computation failed (non-fatal):", err);
}

// Step 8: Insert do bazy z mentor_specific_metrics
await admin.from("analyses").insert({
  ...
  mentor_specific_metrics: mentorSpecificMetrics,
  ...
});
```

## Performance Considerations

### Szybkość Obliczeń

1. **Keyword matching**: ~10-50ms per metric
2. **Timestamp analysis**: ~20-100ms per metric
3. **AI analysis**: ~500-2000ms per metric

### Optymalizacja

- Keyword matching wykonywane synchronicznie
- AI calls wykonywane tylko dla metryk wymagających kontekstu
- Non-fatal errors: jeśli metryka się nie policzy, zapisujemy 0 i kontynuujemy
- Używamy GPT-4o-mini (szybszy i tańszy) zamiast GPT-4o dla prostych analiz

## Frontend Display

Metryki specyficzne dla mentorów powinny być wyświetlane:

1. **W sekcji "Mentor Focus Areas"** - obok bazowych metryk
2. **Z progress bars** pokazującymi ideal_range
3. **Z tooltipami** wyjaśniającymi description i how_to_score
4. **Z wagami** (weight) pokazującymi ważność dla danego mentora

Przykład UI:
```
🎯 Mentor Focus Areas (Sales)

Urgency Density: 4.2/min ████████░░ 70% (target: 3-6/min) [weight: 35%]
Close Attempts: 2 ██████░░░░ 67% (target: 1-3) [weight: 25%]
Tonality Shifts: 8/min ████████░░ 80% (target: 5-10/min) [weight: 20%]
Objection Pre-emption: 1 ████░░░░░░ 50% (target: 1-3) [weight: 20%]
```

## Rozszerzanie Systemu

### Dodawanie Nowej Metryki

1. **Dodaj definicję do migracji** `020_mentor_specific_metrics.sql`
2. **Implementuj funkcję obliczeniową** w `mentor-metrics.ts`
3. **Dodaj dispatcher case** w `computeSingleMetric()`
4. **Przetestuj** na przykładowych transkryptach

### Dodawanie Nowej Kategorii

1. **Dodaj kategorię** do `speaker_categories`
2. **Zdefiniuj 3-5 metryk** specyficznych dla tej kategorii
3. **Implementuj computation functions** jeśli potrzebne nowe
4. **Zaktualizuj dokumentację**

## Migracja

Uruchom migrację:
```bash
supabase db push
```

Lub w Supabase Dashboard → SQL Editor:
```sql
-- Uruchom zawartość supabase/migrations/020_mentor_specific_metrics.sql
```

## Testing

Przykładowy test flow:
1. Nagraj 60s audio z dużą ilością urgency words ("now", "today", "limited")
2. Wybierz mentora z kategorii Sales (np. Jordan Belfort)
3. Przeanalizuj nagranie
4. Sprawdź `analyses.mentor_specific_metrics.urgency_density` - powinno być 3-6/min
5. Sprawdź frontend display - metryka powinna być widoczna z progress bar

## Troubleshooting

### Metryka zawsze zwraca 0
- Sprawdź czy keywords są poprawne dla języka transkryptu
- Sprawdź czy regex pattern jest case-insensitive
- Dodaj console.log w funkcji obliczeniowej

### AI metrics timeout
- Zwiększ timeout dla fetch call
- Użyj gpt-4o-mini zamiast gpt-4o
- Skróć prompt jeśli transkrypt jest bardzo długi

### Metryka nie zapisuje się do bazy
- Sprawdź czy kolumna `mentor_specific_metrics` istnieje w `analyses`
- Sprawdź czy migracja została uruchomiona
- Sprawdź logi edge function dla błędów insertów
