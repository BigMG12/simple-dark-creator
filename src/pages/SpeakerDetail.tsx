import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, Mic, Sparkles, Youtube, Upload, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/nav/AppShell";
import type { Speaker } from "@/data/speakers";
import { CATEGORY_BY_ID, type CategoryId } from "@/data/categories";
import { useMentor } from "@/hooks/use-mentor";
import { useSpeaker } from "@/hooks/queries/useSpeakers";
import { useSpeakerCategories } from "@/hooks/queries/useSpeakerCategories";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAUSE_LEVEL: Record<string, number> = { low: 33, medium: 66, high: 100 };
const PAUSE_LABEL: Record<string, string> = {
  low: "Niski — napędzająca kadencja",
  medium: "Średni — zrównoważony",
  high: "Wysoki — ważona cisza",
};

const SOURCE_LABEL = {
  youtube: "YouTube",
  rumble: "Rumble",
  spotify: "Spotify",
  upload: "Upload",
} as const;

function nameToCategoryId(name: string | undefined): CategoryId {
  const slug = (name ?? "").toLowerCase();
  const known: CategoryId[] = [
    "motivation",
    "sales",
    "influence",
    "leadership",
    "storytelling",
    "authority",
  ];
  return (known.find((k) => k === slug) ?? "motivation") as CategoryId;
}

function adaptDbSpeaker(row: any, catName: string | undefined): Speaker {
  const sourceType = row.source_type === "user_imported" ? "imported" : "curated";
  return {
    id: row.id,
    name: row.name,
    monogram: row.monogram,
    specialty: row.specialty,
    category: nameToCategoryId(catName),
    signatureTrait: row.signature_trait,
    bio: row.bio,
    idealWpm: [row.ideal_wpm_min, row.ideal_wpm_max],
    pauseFrequency: (row.ideal_pause_frequency ?? "medium") as Speaker["pauseFrequency"],
    energyProfile: row.energy_profile,
    famousSpeeches: Array.isArray(row.famous_speeches) ? row.famous_speeches : [],
    learnings: Array.isArray(row.learnings) ? row.learnings : [],
    styleTraits: Array.isArray(row.style_traits) ? row.style_traits : [],
    commonThemes: Array.isArray(row.common_themes) ? row.common_themes : [],
    perfectFor: row.perfect_for ?? "",
    source: sourceType as Speaker["source"],
    sortOrder: row.sort_order,
    addedAt: row.created_at,
  };
}

export default function SpeakerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbRow, isLoading } = useSpeaker(id);
  const { data: dbCategories = [] } = useSpeakerCategories();
  const [mentorId, setMentor] = useMentor();

  const catName = (dbCategories as any[]).find(
    (c) => c.id === (dbRow as any)?.category_id,
  )?.name;
  const speaker = dbRow ? adaptDbSpeaker(dbRow, catName) : null;

  if (!speaker) {
    if (isLoading) {
      return (
        <AppShell>
          <div className="max-w-2xl mx-auto px-5 py-20 text-center text-muted-foreground">
            Wczytywanie mówcy…
          </div>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-5 py-20 text-center">
          <h1 className="font-display text-3xl mb-3">Mówca nie znaleziony</h1>
          <Button variant="ghost-dark" onClick={() => navigate("/speakers")}>
            <ArrowLeft />
            Powrót do biblioteki
          </Button>
        </div>
      </AppShell>
    );
  }

  const isMentor = mentorId === speaker.id;
  const cat = CATEGORY_BY_ID[speaker.category];
  const CatIcon = cat.icon;
  const accent = `hsl(var(--${cat.accentVar}))`;
  const gradient = `var(--${cat.gradientVar})`;

  const SCALE_MIN = 80;
  const SCALE_MAX = 200;
  const range = SCALE_MAX - SCALE_MIN;
  const left = ((speaker.idealWpm[0] - SCALE_MIN) / range) * 100;
  const width = ((speaker.idealWpm[1] - speaker.idealWpm[0]) / range) * 100;

  const SourceIcon =
    speaker.importedFrom === "youtube" ? Youtube : speaker.importedFrom === "upload" ? Upload : Layers;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-10">
        <button
          type="button"
          onClick={() => navigate("/speakers")}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wszyscy mówcy
        </button>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center gap-6">
          <div
            className="h-24 w-24 rounded-2xl flex items-center justify-center font-mono text-3xl font-bold text-primary-foreground shadow-elegant shrink-0"
            style={{ background: gradient }}
          >
            {speaker.monogram}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono uppercase tracking-wider"
                style={{
                  color: accent,
                  borderColor: `${accent}`,
                  background: `hsl(var(--${cat.accentVar}) / 0.1)`,
                }}
              >
                <CatIcon className="h-3 w-3" />
                {cat.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                {speaker.specialty}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl mb-2">{speaker.name}</h1>
            <p className="italic text-muted-foreground">{speaker.signatureTrait}</p>
          </div>
          {isMentor && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-gold text-accent-foreground text-xs font-semibold shadow-elegant">
              <Check className="h-3.5 w-3.5" />
              Twój mentor
            </div>
          )}
        </header>

        {/* Imported metadata */}
        {speaker.source === "imported" && speaker.importedFrom && (
          <div className="card-premium p-5 flex items-center gap-4">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: `hsl(var(--${cat.accentVar}) / 0.12)`, color: accent }}
            >
              <SourceIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm">
                Zaimportowano z <span className="font-semibold">{SOURCE_LABEL[speaker.importedFrom]}</span>
              </div>
              {speaker.transcribedMinutes !== undefined && (
                <div className="font-mono text-[11px] text-muted-foreground">
                  Na podstawie {speaker.transcribedMinutes} minut transkrypcji
                </div>
              )}
            </div>
          </div>
        )}

        {/* Style profile */}
        <section className="card-premium p-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Profil stylu
          </div>
          <p className="text-foreground/90 text-lg leading-relaxed">{speaker.bio}</p>
        </section>

        {/* Style Traits */}
        <section className="card-premium p-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Cechy stylu
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {speaker.styleTraits.map((trait, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/40"
              >
                <div
                  className="h-6 w-6 rounded-md shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-primary-foreground"
                  style={{ background: gradient }}
                >
                  {i + 1}
                </div>
                <span className="text-sm text-foreground/90 leading-relaxed">{trait}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Common Themes */}
        <section className="card-premium p-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Wspólne tematy
          </div>
          <div className="flex flex-wrap gap-2">
            {speaker.commonThemes.map((theme) => (
              <span
                key={theme}
                className="px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  color: accent,
                  borderColor: `hsl(var(--${cat.accentVar}) / 0.4)`,
                  background: `hsl(var(--${cat.accentVar}) / 0.08)`,
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        </section>

        {/* Perfect For */}
        <section
          className="rounded-xl p-7 border"
          style={{
            background: `hsl(var(--${cat.accentVar}) / 0.06)`,
            borderColor: `hsl(var(--${cat.accentVar}) / 0.3)`,
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>
            Idealny dla
          </div>
          <p className="text-xl font-display leading-snug">
            <span style={{ color: accent }}>Trenuj z {speaker.name}</span>{" "}
            <span className="text-foreground/90">{speaker.perfectFor}</span>
          </p>
        </section>

        {/* Ideal metrics */}
        <section className="card-premium p-7 space-y-7">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Idealne tempo
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-3xl tabular-nums text-foreground">
                {speaker.idealWpm[0]}–{speaker.idealWpm[1]}
              </span>
              <span className="font-mono text-xs text-muted-foreground">WPM</span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute top-0 bottom-0 rounded-full shadow-glow"
                style={{ left: `${left}%`, width: `${width}%`, background: gradient }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{SCALE_MIN}</span>
              <span>{SCALE_MAX} WPM</span>
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Częstotliwość pauz
            </div>
            <div className="text-foreground mb-2">{PAUSE_LABEL[speaker.pauseFrequency]}</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${PAUSE_LEVEL[speaker.pauseFrequency]}%`, background: gradient }}
              />
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Profil energii
            </div>
            <span
              className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: gradient }}
            >
              {speaker.energyProfile}
            </span>
          </div>
        </section>

        {/* Famous speeches */}
        {speaker.famousSpeeches.length > 0 && (
          <section>
            <h2 className="font-display text-2xl mb-4">Słynne przemówienia</h2>
            <div className="space-y-2">
              {speaker.famousSpeeches.map((sp) => (
                <a
                  key={sp.title}
                  href={sp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-premium p-5 flex items-center justify-between group"
                >
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {sp.title}
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Learnings */}
        <section>
          <h2 className="font-display text-2xl mb-4">Czego się nauczysz</h2>
          <ul className="space-y-3">
            {speaker.learnings.map((l, i) => (
              <li key={i} className="card-premium p-5 flex gap-4">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-primary-foreground shrink-0"
                  style={{ background: gradient }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="text-foreground/90 leading-relaxed">{l}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Extended Persona - Verbal Signatures */}
        {speaker.persona?.favoriteWords && speaker.persona.favoriteWords.length > 0 && (
          <section className="card-premium p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
              Ulubione słowa i zwroty
            </div>
            <div className="flex flex-wrap gap-2">
              {speaker.persona.favoriteWords.map((word) => (
                <span
                  key={word}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border"
                  style={{
                    color: accent,
                    borderColor: `hsl(var(--${cat.accentVar}) / 0.4)`,
                    background: `hsl(var(--${cat.accentVar}) / 0.08)`,
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Rhetorical Arsenal */}
        {speaker.persona?.rhetoricalDevices && speaker.persona.rhetoricalDevices.length > 0 && (
          <section className="card-premium p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
              Arsenał retoryczny
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {speaker.persona.rhetoricalDevices.map((device, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/40"
                >
                  <div
                    className="h-6 w-6 rounded-md shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-primary-foreground"
                    style={{ background: gradient }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-sm text-foreground/90 leading-relaxed">{device}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* What This Mentor Hates */}
        {speaker.persona?.hates && speaker.persona.hates.length > 0 && (
          <section className="card-premium p-7 border-l-4 border-l-destructive">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-4">
              Czego ten mentor nienawidzi
            </div>
            <ul className="space-y-2">
              {speaker.persona.hates.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                  <span className="text-destructive mt-0.5">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Perfect For / Not For */}
        {speaker.persona?.perfectForNotFor && (
          <section className="grid md:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-6 border-2"
              style={{
                borderColor: `hsl(var(--success))`,
                background: `hsl(var(--success) / 0.05)`,
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-success mb-3">
                Idealny dla
              </div>
              <p className="text-foreground/90 leading-relaxed">
                {speaker.persona.perfectForNotFor.perfectFor}
              </p>
            </div>
            <div
              className="rounded-xl p-6 border-2"
              style={{
                borderColor: `hsl(var(--destructive))`,
                background: `hsl(var(--destructive) / 0.05)`,
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-3">
                Nie dla
              </div>
              <p className="text-foreground/90 leading-relaxed">
                {speaker.persona.perfectForNotFor.notFor}
              </p>
            </div>
          </section>
        )}

        {/* Sample Feedback Preview */}
        {speaker.persona?.sampleFeedback && (
          <section
            className="rounded-xl p-7 border-2 relative overflow-hidden"
            style={{
              borderColor: accent,
              background: `hsl(var(--${cat.accentVar}) / 0.05)`,
            }}
          >
            <div className="absolute top-5 left-6 font-display text-6xl leading-none select-none" style={{ color: accent, opacity: 0.15 }}>
              "
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: accent }}>
              Przykładowy feedback od {speaker.name}
            </div>
            <p className="text-lg leading-relaxed italic pl-8" style={{ fontFamily: 'Georgia, serif', color: accent }}>
              "{speaker.persona.sampleFeedback}"
            </p>
          </section>
        )}

        {/* Footer actions */}
        <section className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="fire"
            size="lg"
            className="flex-1"
            onClick={async () => {
              if (!isMentor) {
                const saved = await setMentor(speaker.id);
                if (saved) {
                  toast.success(`${speaker.name} jest teraz twoim mentorem.`);
                }
              } else {
                toast(`${speaker.name} jest już twoim mentorem.`);
              }
            }}
          >
            <Check />
            {isMentor ? `${speaker.name} jest twoim mentorem` : `Ustaw ${speaker.name} jako mentora`}
          </Button>
          <Button
            size="lg"
            className={cn(
              "flex-1 bg-gradient-gold text-accent-foreground hover:opacity-90 font-semibold shadow-elegant hover:-translate-y-0.5 transition-all",
            )}
            onClick={() => navigate("/record")}
          >
            <Mic />
            Rozpocznij sesję
          </Button>
        </section>

        <div className="text-center pb-6">
          <button
            type="button"
            onClick={() => navigate("/drills")}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Lub spróbuj dzisiejszego ćwiczenia
          </button>
        </div>
      </div>
    </AppShell>
  );
}
