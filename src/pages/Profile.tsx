import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  Bell,
  Crown,
  Download,
  Flame,
  LogOut,
  Medal,
  Mic,
  Pencil,
  Rocket,
  Star,
  Sun,
  Trash2,
  Trophy,
  Zap,
  ChevronRight,
  ExternalLink,
  Youtube,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppShell } from "@/components/nav/AppShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useProfile,
  useUpdateProfile,
  useDashboardStats,
  useSpeaker,
  useBadges,
  useAchievementsTimeline,
  useMyImportedSpeakers,
} from "@/hooks/queries";

const ICONS = {
  flame: Flame,
  trophy: Trophy,
  zap: Zap,
  star: Star,
  mic: Mic,
  crown: Crown,
  rocket: Rocket,
  medal: Medal,
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return "Dziś";
  if (diff === 1) return "Wczoraj";
  if (diff < 7) return `${diff} dni temu`;
  if (diff < 30) return `${Math.floor(diff / 7)} tyg. temu`;
  return `${Math.floor(diff / 30)} mies. temu`;
}

function StatTile({
  label,
  value,
  sub,
  to,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  to?: string;
}) {
  const content = (
    <div className="card-premium p-5 h-full flex flex-col gap-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-3xl tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function TimelineItem({ item, last }: { item: any; last: boolean }) {
  const Icon = ICONS[item.icon as keyof typeof ICONS] || Star;
  const tone =
    item.kind === "level"
      ? "bg-gradient-primary text-primary-foreground"
      : item.kind === "milestone"
        ? "bg-gradient-gold text-accent-foreground"
        : "bg-surface border border-border text-foreground";
  return (
    <li className="relative pl-12 pb-6 last:pb-0">
      {!last && (
        <span className="absolute left-[19px] top-10 bottom-0 w-px bg-border" aria-hidden />
      )}
      <span
        className={cn(
          "absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center shadow-elegant",
          tone,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-base leading-tight">{item.title}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          {relativeDate(item.date || item.created_at)}
        </div>
      </div>
      <div className="text-sm text-muted-foreground mt-0.5">{item.detail || item.description}</div>
    </li>
  );
}

export default function Profile() {
  const navigate = useNavigate();

  // Fetch data from Supabase
  const { data: profile } = useProfile();
  const { data: stats } = useDashboardStats();
  const { data: mentor } = useSpeaker(profile?.selected_speaker_id);
  const { data: achievements = [] } = useAchievementsTimeline();
  const { data: importedSpeakers = [] } = useMyImportedSpeakers();
  const updateProfile = useUpdateProfile();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.full_name || "");
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState("08:00");

  // Calculate derived values
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpToNext = level * 100;
  const xpPct = Math.round((xp / xpToNext) * 100);
  const initials = profile?.full_name
    ?.split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error("Imię nie może być puste.");
      return;
    }

    try {
      await updateProfile.mutateAsync({ full_name: trimmed });
      setEditOpen(false);
      toast.success("Profil zaktualizowany.");
    } catch (error) {
      toast.error("Nie udało się zaktualizować profilu.");
    }
  };

  const downloadData = () => {
    const data = { profile, stats, achievements };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "big-speaking-data.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Twoje dane są pobierane.");
  };

  return (
    <AppShell>
      <TooltipProvider delayDuration={150}>
        <div className="max-w-5xl mx-auto px-5 lg:px-10 py-10 lg:py-14 space-y-12">
          {/* Header / ID card */}
          <section className="card-premium p-6 md:p-8 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-gradient-primary flex items-center justify-center font-mono text-3xl font-bold text-primary-foreground shadow-elegant shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">
                    ID operatora · Dołączył {formatDate(profile?.created_at || new Date().toISOString())}
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl leading-tight truncate">
                    {profile?.full_name || "Użytkownik"}
                  </h1>
                  <p className="text-sm text-muted-foreground truncate">{profile?.email || ""}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-gold text-accent-foreground text-xs font-mono uppercase tracking-wider font-bold shadow-elegant">
                    <Award className="h-3.5 w-3.5" />
                    Level {level}
                  </div>
                  <div className="flex-1 min-w-[180px] max-w-md">
                    <div className="flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground mb-1">
                      <span>{xp} XP</span>
                      <span>{xpToNext} XP</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary"
                        style={{ width: `${xpPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:self-start">
                <Button variant="ghost-dark" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edytuj profil
                </Button>
              </div>
            </div>
          </section>

          {/* Stats grid */}
          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-4">
              Statystyki życiowe
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile label="Sesje" value={stats?.total_sessions || 0} />
              <StatTile
                label="Minuty mówienia"
                value={Math.round((stats?.total_minutes_spoken || 0))}
                sub="we wszystkich sesjach"
              />
              <StatTile label="Średni wynik" value={Math.round(stats?.average_score || 0)} />
              <StatTile
                label="Najlepszy wynik"
                value={
                  <span className="text-gradient-primary">
                    {stats?.best_score || "—"}
                  </span>
                }
                sub={
                  stats?.best_recording_id ? (
                    <Link
                      to={`/results/${stats.best_recording_id}`}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {stats.best_score_date ? formatDate(stats.best_score_date) : ""}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  ) : undefined
                }
              />
              <StatTile label="Wykonane ćwiczenia" value={stats?.total_drills_completed || 0} />
              <StatTile
                label="Seria"
                value={
                  <span className="inline-flex items-center gap-2">
                    {stats?.current_streak || 0}
                    <Flame className="h-5 w-5 text-primary" />
                  </span>
                }
                sub={`Najdłuższa: ${stats?.longest_streak || 0} dni`}
              />
            </div>
          </section>

          {/* My Channel */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                Mój kanał
              </div>
              {importedSpeakers.length > 0 && (
                <Link
                  to="/my-channel"
                  className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Zobacz wszystkie <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            {importedSpeakers.length > 0 ? (
              <Link to="/my-channel" className="card-premium p-5 flex items-center gap-4 tap-press">
                <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center font-mono font-bold text-primary-foreground shadow-elegant shrink-0">
                  {importedSpeakers[0]?.monogram || "YT"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base">{importedSpeakers[0]?.name || "Mój kanał"}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {importedSpeakers.length} {importedSpeakers.length === 1 ? "zaimportowany mówca" : "zaimportowanych mówców"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ) : (
              <Link
                to="/my-channel"
                className="card-premium p-5 flex items-center gap-4 tap-press"
              >
                <div className="h-12 w-12 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                  <Youtube className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base">Połącz kanał YouTube</p>
                  <p className="text-xs text-muted-foreground">
                    Śledź swój styl w każdym nagraniu.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
          </section>

          {/* Personal Records link */}
          <section>
            <Link to="/records" className="card-premium p-5 flex items-center gap-4 tap-press">
              <div className="h-12 w-12 rounded-lg bg-gradient-gold flex items-center justify-center shrink-0">
                <Trophy className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base">Galeria sław</p>
                <p className="text-xs text-muted-foreground">Twoje osobiste rekordy i kamienie milowe.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </section>

          <section className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card-premium p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-5">
                Twoja podróż
              </div>
              {achievements.length > 0 ? (
                <ol>
                  {achievements.map((a, i) => (
                    <TimelineItem
                      key={a.id}
                      item={a}
                      last={i === achievements.length - 1}
                    />
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Twoje osiągnięcia pojawią się tutaj po pierwszych sesjach.
                </div>
              )}
            </div>

            <div className="card-premium p-6 flex flex-col">
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-5">
                Obecny mentor
              </div>
              {mentor ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center font-mono font-bold text-primary-foreground shadow-elegant shrink-0">
                      {mentor.monogram}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-lg leading-tight truncate">
                        {mentor.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {mentor.specialty}
                      </div>
                    </div>
                  </div>
                  <p className="italic text-xs text-muted-foreground mb-6 line-clamp-3">
                    {mentor.signature_trait}
                  </p>
                  <div className="mt-auto flex flex-col gap-2">
                    <Button variant="ghost-dark" size="sm" onClick={() => navigate("/speakers")}>
                      Zmień mentora
                      <ChevronRight />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/speakers/${mentor.id}`)}
                    >
                      Zobacz profil
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <Button variant="ghost-dark" onClick={() => navigate("/speakers")}>
                    Wybierz mentora
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Settings */}
          <section className="space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Ustawienia
            </div>

            {/* Account */}
            <div className="card-premium p-6 space-y-5">
              <div className="font-display text-lg">Konto</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Imię</Label>
                  <div className="flex items-center gap-2">
                    <Input value={profile?.full_name || ""} readOnly className="bg-surface" />
                    <Button variant="ghost-dark" size="sm" onClick={() => {
                      setNameDraft(profile?.full_name || "");
                      setEditOpen(true);
                    }}>
                      <Pencil />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={profile?.email || ""} readOnly className="bg-surface" />
                  <p className="text-[10px] text-muted-foreground">
                    Zarządzane przez dostawcę uwierzytelniania.
                  </p>
                </div>
              </div>
              <Button
                variant="link"
                className="px-0"
                onClick={() => toast("Zmiana hasła wkrótce.")}
              >
                Zmień hasło →
              </Button>
            </div>

            {/* Notifications */}
            <div className="card-premium p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div className="font-display text-lg">Powiadomienia</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Codzienne przypomnienie o treningu</div>
                  <div className="text-xs text-muted-foreground">
                    Przypomnienie, aby utrzymać serię.
                  </div>
                </div>
                <Switch
                  checked={reminderOn}
                  onCheckedChange={(v) => {
                    setReminderOn(v);
                    toast(v ? "Przypomnienia włączone." : "Przypomnienia wyłączone.");
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="reminder-time" className="text-sm">
                  Godzina przypomnienia
                </Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  disabled={!reminderOn}
                  className="w-32 font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Appearance */}
            <div className="card-premium p-6 space-y-4">
              <div className="font-display text-lg">Wygląd</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border-2 border-primary bg-surface p-4 flex items-center gap-3">
                  <span className="h-8 w-8 rounded-md bg-background flex items-center justify-center">
                    🌙
                  </span>
                  <div>
                    <div className="text-sm font-medium">Ciemny</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-primary">
                      Aktywny
                    </div>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="rounded-lg border border-border bg-surface/50 p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
                      <span className="h-8 w-8 rounded-md bg-background flex items-center justify-center">
                        <Sun className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-medium">Jasny</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Wkrótce
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Tryb jasny wkrótce dostępny.</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Data */}
            <div className="card-premium p-6 space-y-4">
              <div className="font-display text-lg">Twoje dane</div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Pobierz moje dane</div>
                  <div className="text-xs text-muted-foreground">
                    Eksportuj swoje sesje, wyniki i profil jako JSON.
                  </div>
                </div>
                <Button variant="ghost-dark" size="sm" onClick={downloadData}>
                  <Download />
                  Eksportuj
                </Button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-4">
              <div className="font-display text-lg text-destructive">Strefa niebezpieczna</div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Usuń konto</div>
                  <div className="text-xs text-muted-foreground">
                    Trwale usuń swoje sesje, odznaki i postępy.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Usuń konto
                </Button>
              </div>
              <div className="border-t border-destructive/20 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Wyloguj się</div>
                  <div className="text-xs text-muted-foreground">
                    Zakończ sesję na tym urządzeniu.
                  </div>
                </div>
                <Button
                  variant="ghost-dark"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate("/auth", { replace: true });
                  }}
                >
                  <LogOut />
                  Wyloguj się
                </Button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-border text-center space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              BIG SPEAKING · v1.0
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground inline-flex items-center gap-1">
                Regulamin <ExternalLink className="h-3 w-3" />
              </a>
              <span className="opacity-30">·</span>
              <a href="#" className="hover:text-foreground inline-flex items-center gap-1">
                Prywatność <ExternalLink className="h-3 w-3" />
              </a>
              <span className="opacity-30">·</span>
              <a href="#" className="hover:text-foreground inline-flex items-center gap-1">
                Kontakt <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </footer>
        </div>

        {/* Edit name modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj profil</DialogTitle>
              <DialogDescription>
                Zaktualizuj sposób wyświetlania twojego imienia w BIG SPEAKING.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="name">Pełne imię</Label>
              <Input
                id="name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Anuluj
              </Button>
              <Button variant="fire" onClick={saveName}>
                Zapisz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Usunąć twoje konto?</DialogTitle>
              <DialogDescription>
                To trwale usunie twoje sesje, wyniki, odznaki i serie.
                Ta akcja nie może być cofnięta.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteOpen(false);
                  toast.error("Usuwanie konta wyłączone w wersji demo.");
                }}
              >
                <Trash2 />
                Tak, usuń wszystko
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AppShell>
  );
}
