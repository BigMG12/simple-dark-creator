## Zmiany

### 1. `src/pages/Auth.tsx`
- Zmiana `brandName="Spikky"` → `brandName="Big Speaking"`.
- Logo: zachować pomarańczową ikonę `Flame` (lub zaproponować zmianę — patrz niżej).

### 2. `src/components/ui/sign-up.tsx`
- Naprawa `GoogleIcon` — obecny SVG ma uszkodzoną ścieżkę (ostatni `path` zawiera `.4 6.7-4.9` zamiast poprawnej geometrii, przez co wygląda jak "pomarańczowy ułamek koła" zamiast logo Google). Zamiana na poprawne, oficjalne kolorowe logo Google (4 ścieżki: niebieska, zielona, żółta, czerwona) z viewBox `0 0 48 48`.
- Domyślny `brandName` w komponencie również ustawić na `"Big Speaking"` (kosmetyka).

### 3. Sprawdzić inne miejsca z napisem "Spikky"
- `rg` pokazał tylko `src/pages/Auth.tsx`. Reszta projektu nie zawiera "Spikky", więc nic więcej nie wymaga zmiany. (Tytuł w `index.html` można zostawić bez zmian, chyba że chcesz też tam zaktualizować — do potwierdzenia.)

### Pytanie do potwierdzenia
- Czy nazwa to dokładnie **"Big Speaking"** (dwa słowa, wielkie B i S)? Tak zakładam.
