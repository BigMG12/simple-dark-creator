import { Brain, Zap, PenLine, Swords, Target } from "lucide-react";
import { AppNav } from "@/components/nav/AppNav";
import ExerciseCard from "@/components/exercise/ExerciseCard";

export default function PracticeHub() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="lg:pl-60">
        <div className="mx-auto max-w-5xl px-4 pb-32 pt-10 sm:px-6 sm:pt-16 lg:pt-20">
          {/* HERO */}
          <header className="mb-10 sm:mb-14">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Praktyka
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Co dziś <span className="text-gradient-primary">trenujesz?</span>
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
              Wybierz typ ćwiczenia. Każde robi co innego.
            </p>
          </header>

          {/* FEATURED: Adaptive Session */}
          <div className="mb-8">
            <ExerciseCard
              featured
              badge="Rekomendowane"
              icon={Brain}
              iconColor="text-primary"
              title="Adaptive Session"
              description="AI dobierze 3 ćwiczenia pod Twoją największą słabość. Zero myślenia — wchodzisz i trenujesz to, co naprawdę boli."
              ctaLabel="Zacznij sesję"
              href="/session/start"
            />
          </div>

          {/* 4 EXERCISE TYPES */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            <ExerciseCard
              icon={Zap}
              iconColor="text-amber-400"
              title="Drill"
              description="Krótkie, celowane ćwiczenie na konkretną umiejętność. Idealne na 5 minut."
              ctaLabel="Wybierz drill"
              href="/drills"
            />
            <ExerciseCard
              icon={Target}
              iconColor="text-sky-400"
              title="Impromptu"
              description="Losowy temat, 60 sekund, zero przygotowania. Trening pod presją."
              ctaLabel="Losuj temat"
              href="/exercise/impromptu"
            />
            <ExerciseCard
              icon={PenLine}
              iconColor="text-emerald-400"
              title="Twój temat"
              description="Podaj własny temat lub pytanie. Trenuj dokładnie to, co czeka Cię jutro."
              ctaLabel="Wpisz temat"
              href="/exercise/custom"
            />
            <ExerciseCard
              icon={Swords}
              iconColor="text-rose-400"
              title="Sparring"
              description="Rozmowa z AI mentorem. Realna sytuacja, realny opór, realny feedback."
              ctaLabel="Wejdź w ring"
              href="/sparring"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
