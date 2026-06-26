import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Search, Sparkles, Youtube, Layers, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/nav/AppShell";
import type { Speaker } from "@/data/speakers";
import { CATEGORIES, CATEGORY_BY_ID, type CategoryId } from "@/data/categories";
import { useMentor } from "@/hooks/use-mentor";
import { useSpeakers } from "@/hooks/queries/useSpeakers";
import { useSpeakerCategories } from "@/hooks/queries/useSpeakerCategories";
import { toast } from "sonner";

type TabValue = "all" | CategoryId | "imports";
type SortValue = "alpha" | "recent" | "popular";

// Map a DB speaker_categories.name (e.g. "Motivation") to our local CategoryId.
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

/**
 * Adapt a DB speaker row + categories list into the UI Speaker shape used by
 * the legacy SpeakerCard. Keeps the real DB UUID as `id`.
 */
function adaptDbSpeaker(
  row: any,
  categoryIdToName: Map<string, string>,
): Speaker {
  const catName = row.category_id ? categoryIdToName.get(row.category_id) : undefined;
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

function SourceIcon({ speaker }: { speaker: Speaker }) {
  if (speaker.source === "imported") {
    if (speaker.importedFrom === "youtube") return <Youtube className="h-3 w-3" />;
    if (speaker.importedFrom === "upload") return <Upload className="h-3 w-3" />;
    return <Layers className="h-3 w-3" />;
  }
  return <Sparkles className="h-3 w-3" />;
}

function SpeakerCard({
  speaker,
  isMentor,
  onSelectMentor,
  onOpen,
}: {
  speaker: Speaker;
  isMentor: boolean;
  onSelectMentor: () => void;
  onOpen: () => void;
}) {
  const cat = CATEGORY_BY_ID[speaker.category];
  const Icon = cat.icon;
  const accent = `hsl(var(--${cat.accentVar}))`;
  const gradient = `var(--${cat.gradientVar})`;

  return (
    <div
      className={cn(
        "card-premium p-5 flex flex-col cursor-pointer relative overflow-hidden",
        isMentor && "shadow-glow",
      )}
      onClick={onOpen}
    >
      {/* category top stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: gradient }}
        aria-hidden
      />

      {/* mentor badge */}
      {isMentor && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-gold text-accent-foreground text-[10px] font-mono uppercase tracking-wider font-bold shadow-elegant z-10">
          Mentor
        </div>
      )}

      {/* category + source row */}
      <div className="flex items-center justify-between mb-3 mt-1">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider"
          style={{
            color: accent,
            borderColor: `hsl(var(--${cat.accentVar}) / 0.4)`,
            background: `hsl(var(--${cat.accentVar}) / 0.08)`,
          }}
        >
          <Icon className="h-3 w-3" />
          {cat.name}
        </span>
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title={speaker.source === "imported" ? `Imported from ${speaker.importedFrom}` : "Curated"}
        >
          <SourceIcon speaker={speaker} />
        </span>
      </div>

      {/* monogram in category gradient */}
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center font-mono text-base font-bold text-primary-foreground shadow-elegant mb-4"
        style={{ background: gradient }}
      >
        {speaker.monogram}
      </div>

      <div className="font-display text-lg leading-tight mb-1">{speaker.name}</div>
      <div className="inline-block w-fit px-2 py-0.5 rounded-full bg-surface border border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        {speaker.specialty}
      </div>
      <p className="italic text-xs text-muted-foreground mb-4 line-clamp-2">
        {speaker.signatureTrait}
      </p>
      <div className="font-mono text-[10px] text-muted-foreground tabular-nums mb-3">
        {speaker.idealWpm[0]}–{speaker.idealWpm[1]} WPM
      </div>

      <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
        {isMentor ? (
          <div className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-md bg-gradient-gold text-accent-foreground text-xs font-semibold">
            <Check className="h-3.5 w-3.5" />
            Twój mentor
          </div>
        ) : (
          <Button
            variant="ghost-dark"
            size="sm"
            className="w-full"
            onClick={onSelectMentor}
          >
            Ustaw jako mentora
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Speakers() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("alpha");
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [mentorId, setMentor] = useMentor();

  const { data: dbSpeakers = [], isLoading } = useSpeakers();
  const { data: dbCategories = [] } = useSpeakerCategories();

  const categoryIdToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of dbCategories as any[]) m.set(c.id, c.name);
    return m;
  }, [dbCategories]);

  const speakers = useMemo<Speaker[]>(
    () => (dbSpeakers as any[]).map((r) => adaptDbSpeaker(r, categoryIdToName)),
    [dbSpeakers, categoryIdToName],
  );

  const filtered = useMemo(() => {
    let list = speakers.slice();

    // tab filter
    if (tab === "imports") {
      list = list.filter((s) => s.source === "imported");
    } else if (tab !== "all") {
      list = list.filter((s) => s.category === tab);
    }

    // curated toggle (ignored on My Imports)
    if (tab !== "imports" && curatedOnly) {
      list = list.filter((s) => s.source === "curated");
    }

    // search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.specialty.toLowerCase().includes(q) ||
          s.signatureTrait.toLowerCase().includes(q),
      );
    }

    // sort
    if (sort === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "recent") {
      list.sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));
    } else if (sort === "popular") {
      list.sort((a, b) => (b.communityUseCount ?? 0) - (a.communityUseCount ?? 0));
    }

    return list;
  }, [tab, search, sort, curatedOnly, speakers]);

  const handleSetMentor = async (s: Speaker) => {
    const saved = await setMentor(s.id);
    if (saved) {
      toast.success(`${s.name} jest teraz twoim mentorem.`);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-10 lg:py-14 space-y-8">
        <header className="text-center max-w-2xl mx-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            Biblioteka mentorów
          </div>
          <h1 className="font-display text-4xl md:text-5xl mb-3">
            Trenuj z <span className="text-gradient-primary">Najlepszymi</span>
          </h1>
          <p className="text-muted-foreground">Wybierz swojego mentora. Mierz się z legendami.</p>
        </header>

        {/* Sticky tab bar */}
        <div className="sticky top-16 z-20 -mx-5 lg:-mx-10 px-5 lg:px-10 py-3 bg-background/85 backdrop-blur-md border-y border-border">
          <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <TabButton
              active={tab === "all"}
              onClick={() => setTab("all")}
              label="Wszystkie"
              accent="hsl(var(--foreground))"
            />
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <TabButton
                  key={c.id}
                  active={tab === c.id}
                  onClick={() => setTab(c.id)}
                  label={c.name}
                  icon={<Icon className="h-3.5 w-3.5" />}
                  accent={`hsl(var(--${c.accentVar}))`}
                  gradient={`var(--${c.gradientVar})`}
                />
              );
            })}
            <TabButton
              active={tab === "imports"}
              onClick={() => setTab("imports")}
              label="Moje importy"
              icon={<Upload className="h-3.5 w-3.5" />}
              accent="hsl(var(--accent))"
              gradient="var(--gradient-gold)"
            />
          </div>
        </div>

        {/* Secondary filter bar */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj mówców..."
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
            <SelectTrigger className="md:w-56">
              <SelectValue placeholder="Sortuj według" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alpha">Alfabetycznie</SelectItem>
              <SelectItem value="recent">Ostatnio dodane</SelectItem>
              <SelectItem value="popular">Najczęściej używane przez społeczność</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-border bg-background">
            <Switch
              id="curated-only"
              checked={curatedOnly}
              onCheckedChange={setCuratedOnly}
              disabled={tab === "imports"}
            />
            <Label
              htmlFor="curated-only"
              className="text-xs font-mono uppercase tracking-wider text-muted-foreground cursor-pointer whitespace-nowrap"
            >
              {curatedOnly ? "Tylko kuratorowane" : "Uwzględnij importowane"}
            </Label>
          </div>
        </div>

        {/* My Imports CTA */}
        {tab === "imports" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate("/speakers/import")}
              className="card-shimmer relative w-full text-left rounded-2xl p-7 lg:p-9 bg-gradient-primary shadow-elegant overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary-foreground/70 mb-3">
                  Poza biblioteką
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-primary-foreground mb-3">
                  Trenuj z KAŻDYM
                </h2>
                <p className="text-primary-foreground/90 max-w-xl mb-5 leading-relaxed">
                  Importuj dowolnego mówcę z YouTube, Rumble lub prześlij audio. Nasza AI przeanalizuje
                  ich styl i stworzy niestandardowy profil treningowy.
                </p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-background text-foreground font-semibold shadow-elegant group-hover:-translate-y-0.5 transition-transform">
                  Importuj mówcę
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </button>
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/speakers/imports")}
                className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Zarządzaj importami
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Empty state for imports */}
        {tab === "imports" && filtered.length === 0 && (
          <div className="card-premium p-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Jeszcze nic tu nie ma
            </div>
            <p className="text-muted-foreground">
              Twoi zaimportowani mówcy pojawią się tutaj, gdy ich profil będzie gotowy.
            </p>
          </div>
        )}

        {/* Empty state for non-imports */}
        {tab !== "imports" && filtered.length === 0 && (
          <div className="card-premium p-10 text-center">
            <p className="text-muted-foreground">Żaden mówca nie pasuje do twoich filtrów.</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((s) => (
              <SpeakerCard
                key={s.id}
                speaker={s}
                isMentor={mentorId === s.id}
                onSelectMentor={() => handleSetMentor(s)}
                onOpen={() => navigate(`/speakers/${s.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  accent,
  gradient,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  accent: string;
  gradient?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 snap-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all border",
        active
          ? "text-primary-foreground shadow-elegant border-transparent"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
      style={
        active
          ? { background: gradient ?? accent, color: "hsl(var(--primary-foreground))" }
          : { borderColor: `${accent} / 0.25` }
      }
    >
      {icon}
      {label}
    </button>
  );
}
