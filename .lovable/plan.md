
# Głębsza i mądrzejsza ocena wystąpień

Cel: przenieść ocenę z `gpt-4o` / `gpt-4o-mini` na **flagowy model rozumujący `openai/gpt-5.6-sol`** (Responses API, reasoning "medium") i zamienić dzisiejsze "AI wystawia liczbę z brzucha" na deterministyczny, transparentny rubryk oparty na metrykach + rozumowanie mentora.

---

## 1. Upgrade modelu (backend, edge functions)

Zastępujemy stare modele na Lovable AI Gateway (Responses API, streaming, reasoning summary zapisywany w DB):

| Plik | Teraz | Po zmianie |
|---|---|---|
| `analyze-recording/mentor-analysis.ts` | `gpt-4o` (OpenAI direct) | `openai/gpt-5.6-sol` (Gateway Responses, reasoning=medium) |
| `analyze-recording/mentor-analysis-v2.ts` | `gpt-4o` | `openai/gpt-5.6-sol` |
| `analyze-recording/mentor-metrics.ts` (4×) | `gpt-4o-mini` | `openai/gpt-5.6-terra` (tańszy, ale wciąż GPT-5.6) |
| `analyze-recording/v1-enrichment.ts` | `gemini-3-flash-preview` | `openai/gpt-5.6-luna` (szybki, tani) |
| `analyze-sentences/index.ts` | `gpt-4o` | `openai/gpt-5.6-sol` z reasoning |
| `analyze-conversation/index.ts` | `gpt-4o` | `openai/gpt-5.6-sol` z reasoning |
| `style-matching.ts` | `gpt-4o-mini` | zostaje (embeddings) |

Wszystkie wywołania idą przez `LOVABLE_API_KEY` + Responses API ze streamingiem (konsumowanym server-side, bo edge function zwraca końcowy JSON). Dodajemy `reasoning: { effort: "medium", summary: "auto" }` i `include: ["reasoning.encrypted_content"]`.

## 2. Deterministyczny rubryk score (0–100)

Dziś: mentor patrzy na metryki i "czuje" ocenę → wyniki skaczą.  
Nowy `scoring.ts` liczy **hard score** z ważonych sub-scorów, mentor tylko koryguje ±10 pkt z uzasadnieniem.

Wagi (sumują się do 100):

- **Płynność (25)** — filler rate, powtórzenia, tempo (WPM w oknie mentora)
- **Struktura (20)** — długość zdań, spójność, sygnały dyskursu (`bo`, `dlatego`, `po pierwsze`)
- **Słownictwo (15)** — unique-word ratio + długość słów + wykrycie żargonu/pustych fraz
- **Pauzy (15)** — istniejący `computePauseMasteryScore` vs profil mentora
- **Prozodia / głos (15)** — Hume: energia, pewność, wariancja emocji
- **Dopasowanie do mentora (10)** — cosine similarity z `style-matching`

`finalScore = clamp(hardScore + mentorDelta, 0, 100)` gdzie `mentorDelta ∈ [-10, +10]` z GPT-5.6.

## 3. Głębsza analiza per zdanie

`analyze-sentences` dziś zwraca krótki komentarz. Po zmianie:

- **Reasoning enabled** — model dostaje pełen kontekst (transkrypt, prozodia zdania, profil mentora, poprzednie zdania) i myśli.
- Nowe pola w `sentence_analyses`:
  - `rewrite` — jedna konkretna lepsza wersja tego zdania
  - `why_it_matters` — 1 zdanie dlaczego to ważne w stylu mentora
  - `technique_tag` — np. `"pauza-po-kluczowym-słowie"`, `"trójka-retoryczna"`, `"kill-filler"`
  - `severity` — `info | warn | critical` (napędza kolor na mini-mapie jakości)
- Reasoning summary z modelu zapisywany do `analyses.reasoning_summary` (opcjonalne rozwinięcie w UI, klikalne "Pokaż jak mentor myślał").

## 4. Migracja SQL (090b)

```sql
alter table public.sentence_analyses
  add column if not exists rewrite text,
  add column if not exists why_it_matters text,
  add column if not exists technique_tag text,
  add column if not exists severity text check (severity in ('info','warn','critical'));

alter table public.analyses
  add column if not exists hard_score int,
  add column if not exists mentor_delta int,
  add column if not exists score_breakdown jsonb,   -- {fluency, structure, vocab, pauses, prosody, match}
  add column if not exists reasoning_summary text;
```

Grants + RLS bez zmian (kolumny w istniejących tabelach).

## 5. UI — pokazać głębię

- **VerdictBanner**: pod gwiazdkami mały pasek "Twarda ocena 72 · Mentor +6 → **78**" z tooltipem "Dlaczego?".
- **Nowa sekcja "Rozkład oceny"** w `Results.tsx` — 6 mini-barów (Płynność/Struktura/…/Match) z wartościami 0–100.
- **SentenceCard**: pod komentarzem → chip z `technique_tag`, przycisk "✍️ Lepsza wersja" pokazujący `rewrite`, oraz "🧠 Jak mentor to widzi" pokazujący `why_it_matters`.
- **Toggle "Pokaż tok myślenia mentora"** w nagłówku raportu → rozwija `reasoning_summary`.

## 6. Co się nie zmienia

- Whisper (transkrypcja) i Hume (prozodia) — bez zmian.
- Storage, RLS, auth, onboarding, drills, rozmowy — bez zmian.
- Gwiazdki Angry Birds — bez zmian, tylko score który je napędza jest teraz solidniejszy.

## 7. Deploy

Po akceptacji: zmiana kodu → migracja SQL przez Management API → deploy 4 edge functions (`analyze-recording`, `analyze-sentences`, `analyze-conversation`, `enrich-sentences-with-prosody`) na `hthjuoswarvsfssxqxxj` moim tokenem.

---

**Efekt dla Ciebie:** oceny są powtarzalne (ta sama próbka = ta sama liczba ±kilka pkt), widzisz **z czego** wynika score, dostajesz konkretną przepisaną wersję każdego zdania i możesz podejrzeć **jak mentor rozumował** — a wszystko napędza GPT-5.6-sol, najmocniejszy dostępny model rozumujący.
