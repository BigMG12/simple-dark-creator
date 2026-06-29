## Plan: Hybrid hack — pinujemy app na `hthjuoswarvsfssxqxxj`

### Cel
Front-end zawsze rozmawia z `hthjuoswarvsfssxqxxj` (Twoje konta, dane, edge functions), niezależnie od tego co Lovable Cloud wpisze do `.env`. Pusty projekt Cloud `pxbzfbhhhrtdvkbrqqfn` ignorujemy całkowicie.

### Co zrobię

**1. Nowy plik `src/integrations/supabase/realClient.ts`**
- Hardcoded URL = `https://hthjuoswarvsfssxqxxj.supabase.co`
- Hardcoded publishable key = `sb_publishable__gOJ0v5RrfqBBOwhzlxG9g_nC3pYfQC` (publishable = bezpieczne w kodzie)
- Te wartości NIE czytają z `import.meta.env` → odporne na nadpisywanie `.env` przez Cloud
- Eksportuje `supabase` (ten sam interface co dotychczas)
- Komentarz blokujący: "Do NOT replace with env-based client. Cloud overwrites .env."

**2. Przekierowanie `src/lib/supabase.ts`**
Zmienia re-export z `@/integrations/supabase/client` na `@/integrations/supabase/realClient`. Wszystkie pliki które importują przez `@/lib/supabase` (większość kodu) automatycznie dostają real client. Zero pracy ręcznej.

**3. Refactor bezpośrednich importów z `@/integrations/supabase/client`**
Skanuję cały `src/` i zmieniam każdy `from "@/integrations/supabase/client"` na `from "@/integrations/supabase/realClient"`. To dotyczy m.in. `SignUpForm.tsx` (który woła `signup-confirmed`), AuthContext, hooków queries itd.

**4. Plik `src/integrations/supabase/client.ts` zostaje nietknięty**
Lovable go regeneruje — nie walczymy z tym. Po prostu nikt go nie importuje.

**5. Update `.env.local.example`/README (opcjonalnie)**
Krótka notka dla Ciebie / przyszłego Ciebie: "Ten projekt pinuje real backend w `realClient.ts`. `.env` jest nadpisywany przez Cloud i ignorowany."

### Czego NIE robię
- Nie ruszam edge functions w `supabase/functions/*` — kod tam jest poprawny.
- Nie deployuję nic — funkcje już są zdeployowane na `hthjuoswarvsfssxqxxj` (`signup-confirmed`, `analyze-recording`, `analyze-sentences`, `send-welcome-email`).
- Nie zmieniam `src/integrations/supabase/client.ts` (auto-gen, walka z platformą bez sensu).
- Nie ruszam Cloud — i tak nie da się go wyłączyć.

### Ograniczenia opcji C (świadomie akceptujemy)
- Nowe edge functions trzeba deployować ręcznie przez CLI (`supabase functions deploy X --project-ref hthjuoswarvsfssxqxxj`). To już robisz.
- Nowe migracje SQL wrzucasz ręcznie do `hthjuoswarvsfssxqxxj` (tak jak Migracja 080).
- Lovable Cloud UI ("View Backend", logi, secrets manager) pokazuje pusty projekt Cloud — bezużyteczne. Wszystko sprawdzasz w panelu Supabase `hthjuoswarvsfssxqxxj`.

### Test po wdrożeniu
1. Otwierasz `/auth?mode=signup` → tworzysz konto.
2. W network logach widzisz request na `https://hthjuoswarvsfssxqxxj.supabase.co/functions/v1/signup-confirmed` (NIE na `pxbzfbhhhrtdvkbrqqfn`).
3. Logujesz się jako `bukmichal33@gmail.com` — działa.
4. Nawet po restarcie / "rozjeździe env" — działa dalej, bo URL jest hardcoded.
