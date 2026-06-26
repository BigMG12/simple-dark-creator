import { Link } from "react-router-dom";

const AuthShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4 py-12">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-float-blob"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-primary-glow/15 blur-3xl animate-float-blob"
        style={{ animationDelay: "4s" }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-block font-display text-2xl font-bold tracking-tighter text-foreground transition-all hover:text-primary hover:[text-shadow:_0_0_24px_hsl(var(--primary)/0.6)]"
          >
            BIG SPEAKING
          </Link>
        </div>

        <div className="card-premium p-6 sm:p-8">{children}</div>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Trenuj · Mierz · Transformuj
        </p>
      </div>
    </div>
  );
};

export default AuthShell;
