const ABOUT_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4";

const STATS = [
  { val: "12K+", label: "Zalogowanych sesji"    },
  { val: "87%",  label: "Poprawa wyniku"  },
  { val: "6",    label: "Głosy mentorów AI"   },
  { val: "15",   label: "Ćwiczenia treningowe"    },
] as const;

const AboutSection = () => (
  <section
    id="about"
    className="relative min-h-screen overflow-hidden flex items-center"
  >
    {/* ── Video background ───────────────────────────────────────────────── */}
    <video
      className="absolute inset-0 w-full h-full object-cover z-0"
      autoPlay
      loop
      muted
      playsInline
    >
      <source src={ABOUT_VIDEO} type="video/mp4" />
    </video>

    {/* ── Dark overlay ───────────────────────────────────────────────────── */}
    <div
      className="absolute inset-0 z-[1]"
      style={{
        background:
          "linear-gradient(180deg, rgba(11,14,26,0.6) 0%, rgba(11,14,26,0.35) 60%, rgba(11,14,26,0.75) 100%)",
      }}
    />

    <div className="container relative z-10 py-20 w-full">
      {/* ── Top row: heading + description ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-[60px]">
        {/* Heading with Condiment accent */}
        <div className="relative inline-block">
          <h2
            className="font-anton uppercase leading-[1.05] text-foreground"
            style={{ fontSize: "clamp(36px, 6vw, 68px)" }}
          >
            Cześć!
            <br />
            Jestem twoim
            <br />
            trenerem AI
          </h2>
          <span
            className="absolute -bottom-3 -right-5 font-condiment text-primary -rotate-3 mix-blend-exclusion opacity-90 pointer-events-none"
            style={{ fontSize: "clamp(40px, 7vw, 80px)" }}
          >
            Głos
          </span>
        </div>

        {/* Description */}
        <p
          className="font-mono uppercase tracking-[0.08em] leading-[1.75] text-foreground max-w-[300px]"
          style={{ fontSize: "clamp(12px, 1.5vw, 15px)" }}
        >
          Partner do mówienia, który nigdy nie śpi.
          <br />
          Inteligencja wykuta z największych
          <br />
          mówców w historii ludzkości.
          <br />
          Jeden cel: uczynić cię nie do zatrzymania.
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-5">
        {STATS.map(({ val, label }) => (
          <div
            key={label}
            className="liquid-glass rounded-[20px] px-8 py-6 min-w-[150px]"
          >
            <span
              className="font-anton leading-none block"
              style={{
                fontSize: "clamp(36px, 5vw, 56px)",
                background: "linear-gradient(135deg, #f5520a, #ff7c2a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {val}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50 mt-1.5 block">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutSection;
