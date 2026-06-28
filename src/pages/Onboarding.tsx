import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ArrowRight, SkipForward } from "lucide-react";
import VSLModal from "@/components/onboarding/VSLModal";

const HEADLINE_WORDS = ["W", "miejscu", "Twojej", "zmiany."];

const Onboarding = () => {
  const navigate = useNavigate();
  const [vslOpen, setVslOpen] = useState(false);

  useEffect(() => {
    try { localStorage.removeItem("bs_needs_onboarding"); } catch {}
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-onboarding-bg text-foreground">
      {/* Ambient warm glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 -right-1/4 h-[80vh] w-[80vh] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(15 95% 55% / 0.28), hsl(15 95% 55% / 0.06) 50%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-[70vh] w-[70vh] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(45 90% 60% / 0.18), transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(0 0% 100% / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(0 0% 100% / 0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      {/* Grain */}
      <div className="texture-overlay" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 md:px-10 md:py-14">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="block h-2 w-2 rounded-full bg-ember shadow-[0_0_12px_hsl(15_95%_55%/0.9)] animate-pulse-glow" />
            <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-warm">
              Big Speaking
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            01 — Wejście
          </span>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col justify-center py-16">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.4em] text-amber-warm opacity-0 animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            Witaj
          </p>

          <h1 className="mt-5 font-serif text-[clamp(2.75rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.02em] text-foreground">
            {HEADLINE_WORDS.map((word, i) => (
              <span
                key={i}
                className="mr-[0.25em] inline-block opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${180 + i * 110}ms` }}
              >
                {i === HEADLINE_WORDS.length - 1 ? (
                  <em className="not-italic bg-gradient-to-br from-ember via-amber-warm to-ember bg-clip-text text-transparent italic font-normal">
                    {word}
                  </em>
                ) : (
                  word
                )}
              </span>
            ))}
          </h1>

          <p
            className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground opacity-0 animate-fade-in-up"
            style={{ animationDelay: "720ms" }}
          >
            Tu zaczyna się Twój głos. Zanim wejdziesz do środka — wybierz, jak chcesz zacząć.
          </p>

          {/* CTA cards */}
          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-5">
            {/* VSL card */}
            <button
              onClick={() => setVslOpen(true)}
              className="group relative md:col-span-3 overflow-hidden rounded-2xl border border-onboarding-line bg-onboarding-surface p-7 md:p-9 text-left transition-all duration-500 hover:border-ember/60 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "880ms" }}
            >
              {/* hover glow */}
              <div
                aria-hidden
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ember/0 blur-3xl transition-all duration-500 group-hover:bg-ember/20"
              />

              <div className="relative flex items-start justify-between gap-6">
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber-warm">
                    Rekomendowane · 2 min
                  </p>
                  <h2 className="font-serif text-3xl md:text-[2.75rem] leading-[1.05] tracking-tight text-foreground">
                    Obejrzyj wprowadzenie
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground max-w-sm">
                    Pokażę Ci jak działa Big Speaking i jak zbudować swój plan nauki krok po kroku.
                  </p>
                </div>

                <div className="shrink-0">
                  <div className="relative flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-ember text-onboarding-bg shadow-[0_0_40px_hsl(15_95%_55%/0.45)] transition-transform duration-500 group-hover:scale-110">
                    <Play className="h-6 w-6 md:h-7 md:w-7 translate-x-0.5" fill="currentColor" />
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full border border-ember/40 animate-ping"
                      style={{ animationDuration: "2.4s" }}
                    />
                  </div>
                </div>
              </div>

              <div className="relative mt-10 flex items-center justify-between border-t border-onboarding-line pt-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  VSL · Intro
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-foreground">
                  Odtwórz
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </button>

            {/* Skip card */}
            <button
              onClick={() => navigate("/welcome")}
              className="group relative md:col-span-2 overflow-hidden rounded-2xl border border-onboarding-line bg-transparent p-7 md:p-9 text-left transition-all duration-500 hover:border-foreground/30 hover:bg-onboarding-surface/40 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1020ms" }}
            >
              <div className="flex h-full flex-col justify-between gap-10">
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                    Dla niecierpliwych
                  </p>
                  <h2 className="font-serif text-2xl md:text-3xl leading-[1.05] tracking-tight text-foreground">
                    Pomiń i przetestuj sam.
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Wejdź od razu do aplikacji i odkryj wszystko na własną rękę.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-onboarding-line pt-5">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <SkipForward className="h-4 w-4" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.28em]">
                      Pomiń tutorial
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer
          className="flex items-center justify-between border-t border-onboarding-line pt-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "1180ms" }}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Krok 01 / 01
          </span>
          <div className="flex items-center gap-2">
            <span className="block h-px w-10 bg-ember" />
            <span className="block h-px w-6 bg-onboarding-line" />
            <span className="block h-px w-6 bg-onboarding-line" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Miejsce Twojej zmiany
          </span>
        </footer>
      </div>

      <VSLModal open={vslOpen} onOpenChange={setVslOpen} />
    </div>
  );
};

export default Onboarding;
