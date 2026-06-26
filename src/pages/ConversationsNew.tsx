import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload,
  Film,
  Video,
  Phone,
  ArrowLeft,
  ArrowRight,
  Target,
  Users,
  User,
  MessageCircle,
  Scale,
  GraduationCap,
  Play,
  Pause,
  Check,
  FileAudio,
  Loader2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { CONVERSATION_TYPE_META, type ConversationType } from "@/data/conversationTypes";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5;
type Source = "audio" | "video" | null;

const TYPE_ICONS = {
  sales: Target,
  meeting: Users,
  interviewee: User,
  interviewer: MessageCircle,
  negotiation: Scale,
  coaching: GraduationCap,
};

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            s === step ? "w-8 bg-gradient-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-border",
          )}
        />
      ))}
    </div>
  );
}

function FakeWaveform({ seed }: { seed: number }) {
  const bars = useMemo(
    () => Array.from({ length: 48 }, (_, i) => 20 + Math.abs(Math.sin(i * 0.6 + seed) * 70 + Math.cos(i * 0.3 + seed) * 30)),
    [seed],
  );
  return (
    <div className="flex items-end gap-0.5 h-12 w-full">
      {bars.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary-glow/80"
          style={{ height: `${Math.min(100, h)}%` }}
        />
      ))}
    </div>
  );
}

export default function ConversationsNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [convType, setConvType] = useState<ConversationType | null>(null);
  const [stakes, setStakes] = useState("");
  const [goal, setGoal] = useState("");
  const [otherParty, setOtherParty] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<"A" | "B" | null>(null);
  const [playing, setPlaying] = useState<"A" | "B" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate upload progress
  useEffect(() => {
    if (!uploading) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setUploading(false);
          return 100;
        }
        return p + 6;
      });
    }, 120);
    return () => clearInterval(id);
  }, [uploading]);

  const handleFileSelected = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setProgress(0);
    setUploading(true);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelected(e.dataTransfer.files?.[0] ?? null);
  };

  const back = () => setStep((s) => Math.max(1, (s - 1) as Step) as Step);

  const startAnalyzing = () => {
    toast({ title: "Integracja backendu w toku — wkrótce dostępne." });
    navigate(`/conversations/conv-demo-1?analyzing=1`);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center justify-between mb-2">
          <Link to="/record" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Powrót do nagrywania
          </Link>
          <Link to="/conversations" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Moje rozmowy
          </Link>
        </div>

        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-center mt-4 mb-2">
          Analizuj prawdziwą <span className="text-gradient-primary">Rozmowę</span>
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Ocenimy tylko twoją stronę. Inni rozmówcy pozostają prywatni.
        </p>

        <StepDots step={step} />

        {/* STEP 1 — Source */}
        {step === 1 && (
          <div className="space-y-4 page-fade">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: "audio" as Source, icon: Upload, title: "Prześlij plik audio", desc: "MP3, WAV, M4A · do 500MB", enabled: true },
                { id: "video" as Source, icon: Film, title: "Prześlij plik wideo", desc: "MP4, MOV, MKV · wyodrębniamy audio", enabled: true },
                { id: null, icon: Video, title: "Wklej link Zoom / Meeting", desc: "Wkrótce", enabled: false },
                { id: null, icon: Phone, title: "Podłącz rejestrator połączeń", desc: "Wkrótce", enabled: false },
              ].map((c, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!c.enabled}
                  onClick={() => {
                    if (!c.enabled) return;
                    setSource(c.id);
                    setStep(2);
                  }}
                  className={cn(
                    "card-premium p-5 text-left tap-press flex items-start gap-4",
                    !c.enabled && "opacity-50 cursor-not-allowed",
                  )}
                  title={!c.enabled ? "Wkrótce" : ""}
                >
                  <div className="h-10 w-10 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Twoje audio jest przetwarzane prywatnie. Oceniamy tylko twój głos.
            </p>
          </div>
        )}

        {/* STEP 2 — Upload */}
        {step === 2 && (
          <div className="space-y-5 page-fade">
            <input
              ref={inputRef}
              type="file"
              accept={source === "video" ? "video/*" : "audio/*"}
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            />

            {!file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="card-premium w-full p-10 flex flex-col items-center text-center border-dashed border-2 border-border hover:border-primary/60 transition-colors"
              >
                <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant mb-4">
                  <Upload className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="font-display text-lg mb-1">Przeciągnij i upuść lub kliknij, aby wybrać</p>
                <p className="text-xs text-muted-foreground">
                  {source === "video" ? "MP4, MOV, MKV" : "MP3, WAV, M4A"} · do 500MB
                </p>
              </button>
            ) : (
              <div className="card-premium p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                    <FileAudio className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{fmtSize(file.size)}</p>
                  </div>
                  {!uploading && progress === 100 && <Check className="h-5 w-5 text-success" />}
                  {uploading && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setProgress(0);
                      setUploading(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground text-right">{progress}%</p>
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Wstecz
              </Button>
              <Button variant="fire" disabled={!file || uploading} onClick={() => setStep(3)}>
                Kontynuuj <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Type */}
        {step === 3 && (
          <div className="space-y-5 page-fade">
            <h2 className="font-display text-xl text-center">Jaki to rodzaj rozmowy?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(CONVERSATION_TYPE_META) as ConversationType[]).map((t) => {
                const meta = CONVERSATION_TYPE_META[t];
                const Icon = TYPE_ICONS[t];
                const selected = convType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConvType(t)}
                    className={cn(
                      "card-premium p-5 text-left tap-press flex items-start gap-4 transition-all",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `hsl(var(--${meta.accent}) / 0.18)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: `hsl(var(--${meta.accent}))` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base">{meta.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Wstecz
              </Button>
              <Button variant="fire" disabled={!convType} onClick={() => setStep(4)}>
                Kontynuuj <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Context */}
        {step === 4 && (
          <div className="space-y-5 page-fade">
            <h2 className="font-display text-xl text-center">Trochę kontekstu (opcjonalnie)</h2>
            <p className="text-sm text-muted-foreground text-center -mt-2">Więcej kontekstu = ostrzejsza informacja zwrotna.</p>
            <div className="card-premium p-5 space-y-4">
              <Field
                label="Co było na szali?"
                placeholder="Zamknięcie umowy na 50 tys. zł · Pitch Series A do 3 VC"
                value={stakes}
                onChange={setStakes}
                multiline
              />
              <Field
                label="Jaki był twój cel?"
                placeholder="Uzyskać ustną zgodę na pilotaż"
                value={goal}
                onChange={setGoal}
                multiline
              />
              <Field
                label="Kim jest druga osoba?"
                placeholder="CFO potencjalnego klienta · Tech lead w StartupCo"
                value={otherParty}
                onChange={setOtherParty}
              />
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Wstecz
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(5)}>
                  Pomiń
                </Button>
                <Button variant="fire" onClick={() => setStep(5)}>
                  Kontynuuj <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Identify */}
        {step === 5 && (
          <div className="space-y-5 page-fade">
            <div className="text-center">
              <h2 className="font-display text-xl">Wykryliśmy 2 osoby mówiące.</h2>
              <p className="text-sm text-muted-foreground mt-1">Która z nich to ty?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["A", "B"] as const).map((s, i) => {
                const selected = selectedSpeaker === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSpeaker(s)}
                    className={cn(
                      "card-premium p-5 text-left tap-press transition-all",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display text-lg">Mówca {s}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaying((p) => (p === s ? null : s));
                        }}
                        className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant"
                      >
                        {playing === s ? <Pause className="h-4 w-4 text-primary-foreground" /> : <Play className="h-4 w-4 text-primary-foreground" />}
                      </button>
                    </div>
                    <FakeWaveform seed={i + 1} />
                    <p className="text-[10px] font-mono text-muted-foreground mt-2">30-sekundowa próbka</p>
                    {selected && (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-primary">
                        <Check className="h-3 w-3" /> Wybrano
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Wstecz
              </Button>
              <Button variant="fire" disabled={!selectedSpeaker} onClick={startAnalyzing}>
                Potwierdź i analizuj <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  multiline,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </label>
  );
}
