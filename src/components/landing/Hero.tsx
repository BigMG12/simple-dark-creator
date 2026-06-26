import { Link } from "react-router-dom";
import { Mic } from "lucide-react";

// ── Video source ────────────────────────────────────────────────────────────
const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4";

// ── Inline SVG icons (keeps bundle light, no lucide equivalents for these) ─
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const SocialButton = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <button
    title={title}
    className="liquid-glass w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-foreground transition-all duration-200 hover:bg-white/10 hover:scale-105"
  >
    {children}
  </button>
);

const NAV_LINKS = [
  { label: "Start",     id: "hero"   },
  { label: "O nas",    id: "about"  },
  { label: "Trening", id: "drills" },
  { label: "Dołącz",     id: "cta"    },
];

const Hero = () => {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      id="hero"
      className="relative h-screen min-h-[600px] overflow-hidden rounded-b-[32px]"
    >
      {/* ── Video background ───────────────────────────────────────────────── */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      {/* ── Dark overlay ───────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,14,26,0.55) 0%, rgba(11,14,26,0.2) 50%, rgba(11,14,26,0.7) 100%)",
        }}
      />

      <div className="container relative z-10">
        {/* ── Navbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-7">
          {/* Logo */}
          <div className="font-anton text-[16px] uppercase tracking-[0.05em] text-foreground">
            BIG.<span className="text-primary">SPEAKING</span>
          </div>

          {/* Center glass pill nav — desktop only */}
          <nav className="hidden lg:flex items-center gap-10 liquid-glass rounded-[28px] px-12 py-4">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="font-anton text-[13px] uppercase tracking-[0.08em] text-foreground hover:text-primary transition-colors duration-200 bg-transparent border-none cursor-pointer"
              >
                {label}
              </button>
            ))}
            <Link
              to="/auth"
              className="font-anton text-[13px] uppercase tracking-[0.08em] text-foreground hover:text-primary transition-colors duration-200"
            >
              Zaloguj się
            </Link>
          </nav>

          {/* Social icons — desktop */}
          <div className="hidden lg:flex flex-col gap-[10px]">
            <SocialButton title="Email"><EmailIcon /></SocialButton>
            <SocialButton title="Twitter / X"><TwitterIcon /></SocialButton>
            <SocialButton title="Instagram"><InstagramIcon /></SocialButton>
          </div>

          {/* Sign-in button — mobile */}
          <Link
            to="/auth"
            className="lg:hidden font-anton text-[13px] uppercase tracking-[0.08em] text-foreground hover:text-primary transition-colors duration-200"
          >
            Zaloguj się
          </Link>
        </div>

        {/* ── Hero content ───────────────────────────────────────────────── */}
        <div className="max-w-[860px] lg:ml-20 pt-14 pb-10">
          {/* Heading + Condiment accent */}
          <div className="relative inline-block">
            <h1
              className="font-anton uppercase leading-[1.02] text-foreground"
              style={{ fontSize: "clamp(42px, 7vw, 92px)" }}
            >
              Mów jak
              <br />
              najwięksi
              <br />
              w historii
            </h1>
            <span
              className="absolute -right-2 bottom-2 md:-right-14 md:bottom-5 font-condiment text-primary -rotate-2 whitespace-nowrap mix-blend-exclusion opacity-90 pointer-events-none"
              style={{ fontSize: "clamp(22px, 4vw, 52px)" }}
            >
              Trener AI
            </span>
          </div>

          {/* Subtitle */}
          <p
            className="font-mono uppercase tracking-[0.1em] text-foreground/65 mt-7 max-w-[460px] leading-[1.7]"
            style={{ fontSize: "clamp(12px, 1.5vw, 15px)" }}
          >
            Trenuj z mentorami AI wzorowanymi na najsilniejszych
            <br />
            głosach w historii. Nagrywaj. Analizuj. Rozwijaj się.
          </p>

          {/* Social — mobile row */}
          <div className="flex gap-[10px] mt-8 lg:hidden">
            <SocialButton title="Email"><EmailIcon /></SocialButton>
            <SocialButton title="Twitter / X"><TwitterIcon /></SocialButton>
            <SocialButton title="Instagram"><InstagramIcon /></SocialButton>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-[14px] flex-wrap mt-10">
            <Link to="/auth?mode=signup">
              <button
                className="font-anton text-[14px] uppercase tracking-[0.08em] px-8 py-3.5 rounded-xl text-white inline-flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 border-none cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #f5520a, #ff7c2a)",
                  boxShadow: "0 8px 24px rgba(245,82,10,0.4)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 12px 32px rgba(245,82,10,0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 8px 24px rgba(245,82,10,0.4)";
                }}
              >
                <Mic className="w-4 h-4" />
                Rozpocznij trening
              </button>
            </Link>

            <button
              onClick={() => scrollTo("about")}
              className="liquid-glass font-anton text-[14px] uppercase tracking-[0.08em] px-8 py-3.5 rounded-xl text-foreground inline-flex items-center gap-2 border border-white/15 hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              Zobacz jak to działa
            </button>
          </div>
        </div>
      </div>

      {/* ── Scroll hint ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-9 left-1/2 z-20 flex flex-col items-center gap-2 opacity-50 animate-scroll-bounce pointer-events-none">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]">
          Przewiń
        </span>
      </div>
    </section>
  );
};

export default Hero;
