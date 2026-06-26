# YouTube Import Debug Log

## Problem
Import YouTube zawsze zostaje w statusie 'queued', `run-import-orchestrator` nigdy nie ma logów (0 invocations).

## Diagnoza

### Co sprawdziliśmy:
1. ✅ Wszystkie 16 edge functions są deployed
2. ✅ Sekrety ustawione (YOUTUBE_API_KEY, OPENAI_API_KEY, etc.)
3. ✅ Tabela `user_speaker_imports_quota` istnieje
4. ✅ Funkcja `check_import_quota(uuid, integer)` istnieje
5. ✅ `run-import-orchestrator` nie wymaga user JWT (przyjmuje service role)

### ROOT CAUSE - EdgeRuntime.waitUntil
**Linia:** `supabase/functions/create-speaker-import-job/index.ts:237-247`

```typescript
EdgeRuntime.waitUntil(
  invokeFunction("run-import-orchestrator", {...})
);
```

**Problem:** `EdgeRuntime.waitUntil` to API Deno Deploy, które **nie istnieje w Supabase Edge Functions**. Supabase używa własnego runtime bez tego API.

**Efekt:** Funkcja crashuje przy próbie wywołania orchestratora, więc orchestrator nigdy nie dostaje requestu.

## Naprawa

### Zmiana 1: create-speaker-import-job/index.ts
Usunąć `EdgeRuntime.waitUntil`, wywołać `invokeFunction` bezpośrednio:

```typescript
// PRZED (crashuje):
EdgeRuntime.waitUntil(
  invokeFunction("run-import-orchestrator", {...}).catch(...)
);

// PO (działa):
invokeFunction("run-import-orchestrator", {...}).catch(...);
```

### Zmiana 2: run-import-orchestrator/index.ts (linia 304)
Taki sam problem.

### Zmiana 3: process-transcripts/index.ts
Sprawdzić czy używa `EdgeRuntime.waitUntil`.

### Zmiana 4: Wszystkie inne funkcje
Grep pokazał 6 plików z `declare const EdgeRuntime` - wszystkie wymagają naprawy.

## Status
- [ ] Naprawić create-speaker-import-job
- [ ] Naprawić run-import-orchestrator  
- [ ] Naprawić process-transcripts
- [ ] Naprawić retry-stuck-imports
- [ ] Naprawić retry-import
- [ ] Naprawić generate-speaker-persona
- [ ] Deploy wszystkich funkcji
- [ ] Test importu

## Potencjalne inne bugi (do osobnej sesji)
- Brak: nie znaleziono innych problemów w pipeline importu
