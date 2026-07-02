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
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { CONVERSATION_TYPE_META, type ConversationType } from "@/data/conversationTypes";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { retryWithBackoff, shouldRetryTransientOnly } from "@/lib/retry";

type Step = 1 | 2 | 3 | 4 | 5;
type Source = "audio" | "video" | null;

interface DetectedSpeaker {
  label: string;
  speaker_id: number;
  duration_seconds: number;
  utterance_count: number;
  sample_text: string;
  sample_utterances?: { start: number; end: number; text: string }[];
}

const TYPE_ICONS = {
  sales: Target,
  meeting: Users,
  interviewee: User,
  interviewer: MessageCircle,
  negotiation: Scale,
  coaching: GraduationCap,
};

const MIN_DURATION_SECONDS = 30;
const MAX_FILE_MB = 500;

// UI type "sales" ↔ backend "sales_call"
function toBackendType(t: ConversationType): string {
  return t === "sales" ? "sales_call" : t;
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
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

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio") as
      | HTMLAudioElement
      | HTMLVideoElement;
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      const d = el.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(d) || d <= 0) reject(new Error("Nie udało się odczytać długości pliku."));
      else resolve(d);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie udało się odczytać pliku audio."));
    };
  });
}

export default function ConversationsNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>(null);
  const [file, setFile] = useState<File | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadAttempt, setUploadAttempt] = useState(0);

  const [convType, setConvType] = useState<ConversationType | null>(null);
  const [stakes, setStakes] = useState("");
  const [goal, setGoal] = useState("");
  const [otherParty, setOtherParty] = useState("");

  // Step 5 — diarization + speaker selection
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("Rozdzielam mówców…");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [detectedSpeakers, setDetectedSpeakers] = useState<DetectedSpeaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [playingSpeaker, setPlayingSpeaker] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioSignedUrl, setAudioSignedUrl] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ────────────────────────────────────────────────────────────────
  // File pick + real upload to storage
  // ────────────────────────────────────────────────────────────────
  const handleFileSelected = async (f: File | null) => {
    if (!f) return;
    setFileError(null);
    setUploadedPath(null);
    setProgress(0);

    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`Plik jest za duży (max ${MAX_FILE_MB}MB).`);
      return;
    }

    setFile(f);

    let duration = 0;
    try {
      duration = await readAudioDuration(f);
    } catch (err) {
      setFileError((err as Error).message);
      return;
    }
    setDurationSec(duration);

    if (duration < MIN_DURATION_SECONDS) {
      setFileError(`Rozmowa musi mieć co najmniej ${MIN_DURATION_SECONDS} sekund.`);
      return;
    }

    // Get current user for storage path
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setFileError("Zaloguj się aby przesyłać pliki.");
      return;
    }

    const ext = f.name.split(".").pop()?.toLowerCase() || "webm";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    setUploading(true);
    setProgress(1);
    setUploadAttempt(1);

    try {
      // Retry the signed URL creation (3 attempts) — usually a quick DB roundtrip.
      const signed = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.storage
            .from("conversations")
            .createSignedUploadUrl(path);
          if (error || !data) throw error ?? new Error("Nie udało się przygotować uploadu.");
          return data;
        },
        { attempts: 3, baseMs: 400, maxMs: 3000 },
      );

      // Retry the actual PUT upload (4 attempts) — reset progress on each try.
      await retryWithBackoff(
        () => {
          setProgress(1);
          return uploadWithProgress(signed.signedUrl, f, (pct) => setProgress(pct));
        },
        {
          attempts: 4,
          baseMs: 800,
          maxMs: 8000,
          onAttempt: (n) => setUploadAttempt(n),
        },
      );

      setUploadedPath(path);
      setProgress(100);
      setUploadAttempt(0);
    } catch (err) {
      console.error("[upload] failed after retries:", err);
      const raw = (err as Error)?.message ?? "";
      setFileError(
        raw && !raw.toLowerCase().includes("network") && !raw.toLowerCase().includes("fetch")
          ? `Upload nie powiódł się: ${raw}`
          : "Upload nie powiódł się po kilku próbach. Sprawdź połączenie i spróbuj ponownie.",
      );
      setUploadedPath(null);
      setUploadAttempt(0);
    } finally {
      setUploading(false);
    }
  };

  const retryUpload = () => {
    if (file) handleFileSelected(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelected(e.dataTransfer.files?.[0] ?? null);
  };

  const back = () => {
    if (step === 5 && processing) return; // don't leave mid-analysis
    setStep((s) => Math.max(1, (s - 1) as Step) as Step);
  };

  const resetFile = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    setUploadedPath(null);
    setDurationSec(null);
    setFileError(null);
    setUploadAttempt(0);
  };

  // ────────────────────────────────────────────────────────────────
  // Step 5 — INSERT conversation + invoke process-conversation
  // ────────────────────────────────────────────────────────────────
  const beginProcessing = async () => {
    if (!uploadedPath || !convType || !file) return;
    setProcessing(true);
    setProcessingError(null);
    setProcessingLabel("Zapisuję rozmowę…");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesja wygasła. Zaloguj się ponownie.");

      // 1. INSERT conversations row
      const { data: convo, error: insertErr } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          audio_url: uploadedPath,
          audio_mime_type: file.type || "audio/webm",
          conversation_type: toBackendType(convType),
          status: "pending",
          duration_seconds: durationSec,
          context_stakes: stakes || null,
          context_goal: goal || null,
          context_other_party: otherParty || null,
        })
        .select("id")
        .single();

      if (insertErr || !convo) throw insertErr ?? new Error("Nie udało się utworzyć rozmowy.");
      setConversationId(convo.id);

      // Signed URL to allow playback of speaker samples.
      const { data: signed } = await supabase.storage
        .from("conversations")
        .createSignedUrl(uploadedPath, 60 * 60);
      if (signed?.signedUrl) setAudioSignedUrl(signed.signedUrl);

      // 2. Invoke process-conversation (Deepgram diarization). This can take
      //    up to ~2 minutes depending on file length. Retry only on transient
      //    network / 5xx errors — never on structured 4xx responses.
      setProcessingLabel("Rozdzielam mówców w rozmowie…");
      const result = await retryWithBackoff(
        async () => {
          const { data, error: fnErr } = await supabase.functions.invoke(
            "process-conversation",
            { body: { conversation_id: convo.id } },
          );
          if (fnErr) {
            const ctx = (fnErr as any).context;
            let msg = fnErr.message || "Diarizacja nie powiodła się.";
            let status: number | undefined;
            if (ctx) {
              try {
                status = (ctx as Response).status;
                const j = typeof ctx === "string" ? JSON.parse(ctx) : await (ctx as Response).json?.();
                if (j?.error) msg = j.error;
              } catch {}
            }
            const wrapped = new Error(msg) as Error & { status?: number };
            wrapped.status = status;
            throw wrapped;
          }
          return data;
        },
        {
          attempts: 3,
          baseMs: 1500,
          maxMs: 6000,
          shouldRetry: shouldRetryTransientOnly,
          onAttempt: (n) => setProcessingLabel(`Ponawiam diarizację (próba ${n}/3)…`),
        },
      );

      // 3. Branch on result
      if (result?.status === "single_speaker_detected" || result?.status === "fell_back_to_solo") {
        toast({
          title: "Wykryto jednego mówcę — analizuję.",
          description: result?.message ?? undefined,
        });
        navigate(`/conversations/${convo.id}?analyzing=1`, { replace: true });
        return;
      }

      if (result?.status === "awaiting_speaker_selection") {
        setDetectedSpeakers((result.speakers ?? []) as DetectedSpeaker[]);
        setProcessing(false);
        return;
      }

      throw new Error(`Nieoczekiwana odpowiedź: ${JSON.stringify(result)}`);
    } catch (err) {
      console.error("[process-conversation] failed:", err);
      setProcessingError((err as Error).message);
      setProcessing(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Speaker sample playback
  // ────────────────────────────────────────────────────────────────
  const playSample = (spk: DetectedSpeaker) => {
    if (!audioSignedUrl) return;
    if (!audioRef.current) audioRef.current = new Audio(audioSignedUrl);
    const audio = audioRef.current;

    if (playingSpeaker === spk.label) {
      audio.pause();
      setPlayingSpeaker(null);
      return;
    }

    const sample = spk.sample_utterances?.[0];
    audio.pause();
    audio.currentTime = sample?.start ?? 0;
    const endAt = sample ? sample.end : (sample?.start ?? 0) + 15;

    const onTime = () => {
      if (audio.currentTime >= endAt) {
        audio.pause();
        setPlayingSpeaker(null);
        audio.removeEventListener("timeupdate", onTime);
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.play().then(() => setPlayingSpeaker(spk.label)).catch(() => setPlayingSpeaker(null));
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  const confirmSpeaker = async () => {
    if (!conversationId || !selectedSpeaker) return;
    setSelecting(true);
    try {
      await retryWithBackoff(
        async () => {
          const { error } = await supabase.functions.invoke("select-user-speaker", {
            body: { conversation_id: conversationId, speaker_label: selectedSpeaker },
          });
          if (error) {
            const ctx = (error as any).context;
            const status = ctx?.status;
            const wrapped = new Error(error.message) as Error & { status?: number };
            wrapped.status = status;
            throw wrapped;
          }
        },
        {
          attempts: 3,
          baseMs: 600,
          maxMs: 4000,
          shouldRetry: shouldRetryTransientOnly,
        },
      );
      navigate(`/conversations/${conversationId}?analyzing=1`, { replace: true });
    } catch (err) {
      toast({
        title: "Nie udało się wybrać mówcy",
        description: (err as Error).message,
        variant: "destructive",
      });
      setSelecting(false);
    }
  };

  const goToStep5 = async () => {
    setStep(5);
    setDetectedSpeakers([]);
    setSelectedSpeaker(null);
    setProcessingError(null);
    setConversationId(null);
    await beginProcessing();
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center justify-between mb-2">
          <Link
            to="/record"
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Powrót do nagrywania
          </Link>
          <Link
            to="/conversations"
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
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
                { id: "audio" as Source, icon: Upload, title: "Prześlij plik audio", desc: `MP3, WAV, M4A, WEBM · do ${MAX_FILE_MB}MB`, enabled: true },
                { id: null, icon: Film, title: "Prześlij plik wideo", desc: "Wkrótce — dodajemy ekstrakcję audio", enabled: false },
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
              accept="audio/*"
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
                  MP3, WAV, M4A, WEBM · min {MIN_DURATION_SECONDS}s · do {MAX_FILE_MB}MB
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
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {fmtSize(file.size)}
                      {durationSec ? ` · ${fmtDur(durationSec)}` : ""}
                    </p>
                  </div>
                  {!uploading && uploadedPath && <Check className="h-5 w-5 text-success" />}
                  {uploading && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  <button
                    type="button"
                    onClick={resetFile}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Usuń plik"
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

            {fileError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-destructive-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive-foreground" />
                <span className="font-medium">{fileError}</span>
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Wstecz
              </Button>
              <Button variant="fire" disabled={!uploadedPath || uploading} onClick={() => setStep(3)}>
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
            <p className="text-sm text-muted-foreground text-center -mt-2">
              Więcej kontekstu = ostrzejsza informacja zwrotna.
            </p>
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
                <Button variant="outline" onClick={goToStep5}>
                  Pomiń
                </Button>
                <Button variant="fire" onClick={goToStep5}>
                  Kontynuuj <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Identify */}
        {step === 5 && (
          <div className="space-y-5 page-fade">
            {processing && (
              <div className="card-premium p-8 flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant mb-4 animate-pulse">
                  <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
                </div>
                <p className="font-display text-lg mb-1">{processingLabel}</p>
                <p className="text-xs text-muted-foreground">
                  To może potrwać do 2 minut przy dłuższych rozmowach.
                </p>
              </div>
            )}

            {processingError && !processing && (
              <div className="card-premium p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display text-base">Coś poszło nie tak.</p>
                    <p className="text-sm text-muted-foreground mt-1">{processingError}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back}>
                    Wstecz
                  </Button>
                  <Button variant="fire" onClick={beginProcessing}>
                    Spróbuj ponownie
                  </Button>
                </div>
              </div>
            )}

            {!processing && detectedSpeakers.length > 0 && (
              <>
                <div className="text-center">
                  <h2 className="font-display text-xl">
                    Wykryliśmy {detectedSpeakers.length}{" "}
                    {detectedSpeakers.length === 1 ? "osobę mówiącą" : "osoby mówiące"}.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Która z nich to ty?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detectedSpeakers.map((s) => {
                    const selected = selectedSpeaker === s.label;
                    const isPlaying = playingSpeaker === s.label;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setSelectedSpeaker(s.label)}
                        className={cn(
                          "card-premium p-5 text-left tap-press transition-all",
                          selected && "ring-2 ring-primary",
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-display text-lg">{s.label}</span>
                          <button
                            type="button"
                            disabled={!audioSignedUrl || !s.sample_utterances?.length}
                            onClick={(e) => {
                              e.stopPropagation();
                              playSample(s);
                            }}
                            className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant disabled:opacity-40"
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4 text-primary-foreground" />
                            ) : (
                              <Play className="h-4 w-4 text-primary-foreground" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground italic line-clamp-3 min-h-[3rem]">
                          „{s.sample_text || "—"}"
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                          <span>{fmtDur(s.duration_seconds)} mówienia</span>
                          <span>{s.utterance_count} wypowiedzi</span>
                        </div>
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
                  <Button variant="ghost" onClick={back} disabled={selecting}>
                    <ArrowLeft className="h-4 w-4" /> Wstecz
                  </Button>
                  <Button variant="fire" disabled={!selectedSpeaker || selecting} onClick={confirmSpeaker}>
                    {selecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Potwierdź i analizuj <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
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

// ────────────────────────────────────────────────────────────────
// XHR upload with real progress reporting
// ────────────────────────────────────────────────────────────────
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload zakończony błędem: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Błąd sieci podczas uploadu."));
    xhr.send(file);
  });
}
