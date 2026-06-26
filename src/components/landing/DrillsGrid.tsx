import { Link } from "react-router-dom";

// ── Three showcase drills — video URLs from design ──────────────────────────
const SHOWCASE_DRILLS = [
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4",
    label:  "Klarowność · Ćwiczenie 01",
    title:  "Precyzyjne słowa",
    href:   "/drills",
  },
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4",
    label:  "Energia · Ćwiczenie 02",
    title:  "Zapłon głosu",
    href:   "/drills",
  },
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4",
    label:  "Tempo · Ćwiczenie 03",
    title:  "Potęga pauzy",
    href:   "/drills",
  },
] as const;

// ── Arrow icon ──────────────────────────────────────────────────────────────
const ArrowRight = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const DrillsGrid = () => (
  <section id="drills" className="bg-[#0b0e1a] py-[100px]">
    <div className="container">
      {/* ── Section header ───────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
        {/* Left: "Collection of Elite Drills" */}
        <div>
          <div
            className="font-anton uppercase leading-[1.05] text-foreground"
            style={{ fontSize: "clamp(36px, 5.5vw, 68px)" }}
          >
            Kolekcja
          </div>
          <div
            className="font-anton uppercase leading-[1.05] text-foreground flex items-baseline gap-3"
            style={{
              fontSize: "clamp(36px, 5.5vw, 68px)",
              marginLeft: "clamp(32px, 4vw, 80px)",
            }}
          >
            <span className="font-condiment text-primary italic" style={{ fontSize: "clamp(36px, 5.5vw, 68px)" }}>
              Elitarnych
            </span>
            <span>Ćwiczeń</span>
          </div>
        </div>

        {/* Right: "SEE ALL TRAINING" with orange underbar */}
        <Link to="/drills" className="text-right group cursor-pointer">
          <span
            className="font-anton uppercase leading-none block text-foreground group-hover:text-primary transition-colors duration-200"
            style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}
          >
            ZOBACZ
          </span>
          <span
            className="font-anton uppercase block leading-[1.3] text-foreground/65"
            style={{ fontSize: "clamp(14px, 2.5vw, 28px)" }}
          >
            WSZYSTKIE
            <br />
            TRENINGI
          </span>
          <div
            className="h-2 w-full rounded-full mt-2.5"
            style={{
              background: "linear-gradient(90deg, #f5520a, #ff7c2a)",
              boxShadow: "0 0 20px rgba(245,82,10,0.5)",
            }}
          />
        </Link>
      </div>

      {/* ── 3-column card grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SHOWCASE_DRILLS.map(({ video, label, title, href }) => (
          <Link
            key={title}
            to={href}
            className="liquid-glass rounded-[32px] p-[18px] cursor-pointer transition-all duration-200 hover:bg-white/[0.06] hover:-translate-y-1.5 block"
          >
            {/* Square video thumbnail */}
            <div
              className="relative rounded-[24px] overflow-hidden bg-[hsl(220_13%_12%)]"
              style={{ paddingBottom: "100%" }}
            >
              <video
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              >
                <source src={video} type="video/mp4" />
              </video>
            </div>

            {/* Card footer bar */}
            <div className="liquid-glass rounded-[20px] px-[18px] py-3.5 mt-3 flex items-center justify-between">
              <div className="flex flex-col gap-[3px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                  {label}
                </span>
                <span className="font-anton text-[18px] text-foreground">
                  {title}
                </span>
              </div>

              {/* Orange circle arrow button */}
              <button
                className="w-12 h-12 rounded-full flex items-center justify-center border-none cursor-pointer transition-transform duration-200 hover:scale-110 flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #f5520a, #c43800)",
                  boxShadow: "0 8px 24px rgba(245,82,10,0.5)",
                }}
                aria-label={`Start ${title}`}
              >
                <ArrowRight />
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default DrillsGrid;
