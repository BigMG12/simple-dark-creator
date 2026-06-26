# Plan: Auto-login po rejestracji + email powitalny

## Co zmieniamy

1. **Auto-login po sign up**
   - W `src/components/auth/SignUpForm.tsx` po udanej rejestracji wywołać `signInWithEmail(email, password)` zamiast polegać na potwierdzeniu mailowym.
   - Wymaga wyłączenia "Confirm email" w ustawieniach Lovable Cloud Auth, żeby użytkownik mógł się od razu zalogować (bez tego signIn zwróci "Email not confirmed"). Zrobimy to przez `configure_auth`.
   - Po sukcesie `AuthContext` wykryje sesję, `PublicOnlyRoute` przekieruje na `/welcome` (już jest taki redirect w `src/pages/Auth.tsx` przez `onAuthenticated`).

2. **Email powitalny (gratulacje za dołączenie)**
   - To jest email transakcyjny (jeden recipient, wywołany zdarzeniem signup) — używamy wbudowanego systemu Lovable Emails.
   - Wymaga: Lovable Cloud (już włączone), skonfigurowanej domeny email, infrastruktury kolejki, oraz scaffoldu transactional email.
   - Krok 1: sprawdzić status domeny. Jeśli brak — pokazać dialog `<presentation-open-email-setup>` i poczekać aż user skonfiguruje, potem kontynuować.
   - Krok 2: `setup_email_infra` + `scaffold_transactional_email` (jeśli jeszcze nie ma).
   - Krok 3: stworzyć szablon `supabase/functions/_shared/transactional-email-templates/welcome.tsx` z gratulacjami w stylu Big Speaking (ciemny brand, pomarańczowy akcent `fire`, polski język, ton zgodny z resztą aplikacji). Zarejestrować w `registry.ts`.
   - Krok 4: wysyłka — po udanym `signUp` w `src/lib/auth.ts` wywołać `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'welcome', recipientEmail: email, idempotencyKey: \`welcome-${user.id}\`, templateData: { name: fullName } } })`.
   - Krok 5: deploy edge functions.

## Treść emaila (propozycja, PL)

- **Subject:** „Witaj w Big Speaking 🔥"
- **Body:** krótkie gratulacje, jedno zdanie o tym co dalej (nagraj pierwszą wypowiedź), CTA "Rozpocznij" → `/welcome`.

## Pytanie do Ciebie

Czy mogę **wyłączyć potwierdzanie emaila** w Auth? Bez tego auto-login nie zadziała (Supabase zablokuje logowanie do czasu kliknięcia w link). Alternatywa: zostawiamy potwierdzenie i auto-login działa dopiero po kliknięciu linku — wtedy nie ma sensu, bo i tak user wraca już zalogowany.

Zakładam **TAK, wyłączamy potwierdzanie** — daj znać jeśli wolisz inaczej.
