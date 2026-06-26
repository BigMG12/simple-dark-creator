import { AppNav } from "@/components/nav/AppNav";
import { TasksSection } from "@/components/dashboard/TasksSection";

export default function Tasks() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="lg:pl-60 pb-24 lg:pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 lg:pt-16">
          <header className="text-center mb-10">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Codziennie
            </p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Twoje <span className="text-gradient-primary">Zadania</span>
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Krótka lista na dziś. Zrób je w swoim tempie — resetują się o północy.
            </p>
          </header>

          <TasksSection />
        </div>
      </main>
    </div>
  );
}
