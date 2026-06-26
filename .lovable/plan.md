## Cel
Dodać pozycję „Zadania" do lewego paska nawigacji (i mobilnego bottom nav), prowadzącą do dedykowanego ekranu z listą zadań dnia (obecnie sekcja TasksSection żyje tylko na Dashboard).

## Zmiany

1. **Nowa strona `src/pages/Tasks.tsx`**
   - Tło i nagłówek w stylu reszty appki (jak `/drills`): mały eyebrow „Codziennie", H1 „Twoje Zadania", krótki podtytuł.
   - Renderuje istniejący `TasksSection` (re-use bez duplikacji logiki).
   - Pod spodem opcjonalna mała wskazówka, że zadania resetują się o północy.

2. **`src/App.tsx`**
   - Dodać route: `<Route path="/tasks" element={<Tasks />} />` w sekcji chronionej.

3. **`src/components/nav/AppNav.tsx`**
   - Dodać do `ITEMS` pozycję `{ to: "/tasks", label: "Zadania", icon: ListChecks }` zaraz po „Start".
   - Mobile bottom nav: zmienić `grid-cols-7` → `grid-cols-8`, żeby pomieścić dodatkową ikonę.

4. **`src/pages/Dashboard.tsx`** — bez zmian (TasksSection zostaje też na Dashboard jako szybki podgląd).

## Detale techniczne
- Ikona: `ListChecks` z `lucide-react` (spójna z resztą nawigacji).
- Strona Tasks używa tego samego `max-w-*` containera co `/drills` dla spójności.
- Nic nie ruszamy w logice `dailyTasks` ani w `TasksSection` — tylko opakowujemy.
