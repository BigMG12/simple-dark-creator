import { Link } from "react-router-dom";

const CTA_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4";

// ── Social icons ────────────────────────────────────────────────────────────
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FinalCTA = () => (
  <section id="cta" className="relative overflow-hidden">
    {/* ── Video — intrinsic dimensions set the section height ─────────────── */}
    <video autoPlay loop muted playsInline className="block w-full h-auto">
      <source src={CTA_VIDEO} type="video/mp4" />
    </video>

    {/* ── Overlay ─────────────────────────────────────────────────────────── */}
    <div
      className="absolute inset-0 z-[1]"
      style={{
        background:
          "linear-gradient(180deg, rgba(11,14,26,0.35) 0%, rgba(11,14,26,0.2) 50%, rgba(11,14,26,0.7) 100%)",
      }}
    />

    {/* ── Right-aligned copy ──────────────────────────────────────────────── */}
    <div className="absolute inset-0 z-10 flex items-center justify-end">
      <div
        className="text-right relative"
        style={{
          paddingRight: "clamp(24px, 8%, 320px)",
          paddingLeft:  "clamp(24px, 5%, 200px)",
        }}
      >
        {/* Condiment italic accent — absolutely positioned above the heading */}
        <span
          className="absolute font-condiment text-primary -rotate-1 mix-blend-exclusion opacity-90 pointer-events-none whitespace-nowrap"
          style={{
            fontSize: "clamp(20px, 4vw, 68px)",
            top:  "-20px",
            left: "clamp(24px, 5%, 200px)",
          }}
        >
          Stań się legendą
        </span>

        <h2
          className="font-anton uppercase text-foreground text-right leading-[1.1]"
          style={{ fontSize: "clamp(20px, 4.5vw, 62px)" }}
        >
          <span
            className="block"
            style={{
              fontSize:     "clamp(28px, 6vw, 80px)",
              marginBottom: "clamp(10px, 3vw, 48px)",
            }}
          >
            Trenuj teraz.
          </span>
          Ucisz swój strach.
          <br />
          Panuj nad każdym pomieszczeniem.
          <br />
          Opanuj swój głos.
        </h2>

        {/* Sign-up CTA */}
        <div className="mt-8 flex justify-end">
          <Link to="/auth?mode=signup">
            <button
              className="font-anton text-[14px] uppercase tracking-[0.08em] px-8 py-3.5 rounded-xl text-white inline-flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 border-none cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #f5520a, #ff7c2a)",
                boxShadow: "0 8px 24px rgba(245,82,10,0.4)",
              }}
            >
              Rozpocznij trening za darmo
            </button>
          </Link>
        </div>
      </div>
    </div>

    {/* ── Social stack — bottom-left ──────────────────────────────────────── */}
    <div className="absolute left-[8%] bottom-[15%] z-20 liquid-glass rounded-[18px] sm:rounded-[20px] overflow-hidden">
      {[
        { icon: <EmailIcon />,     title: "Email"       },
        { icon: <TwitterIcon />,   title: "Twitter / X" },
        { icon: <InstagramIcon />, title: "Instagram"   },
      ].map(({ icon, title }, i, arr) => (
        <button
          key={title}
          title={title}
          className={`flex items-center justify-center text-foreground bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-white/10 ${
            i < arr.length - 1 ? "border-b border-white/10" : ""
          }`}
          style={{
            width:  "clamp(52px, 10vw, 80px)",
            height: "clamp(52px, 10vw, 80px)",
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  </section>
);

export default FinalCTA;
