import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  ChevronRight,
  Mic,
  PlayCircle,
  Upload,
  Youtube,
  X,
  Sparkles,
  Clock,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/nav/AppShell";
import { CATEGORIES, type CategoryId } from "@/data/categories";
import type { ImportSourceType } from "@/data/mockImports";
import { toast } from "sonner";
import { useCreateImportJob } from "@/hooks/mutations";

// ───────────────────────────────────────────────────────────────
// Validation schemas — client-side only. Backend will revalidate.
// ───────────────────────────────────────────────────────────────

const youtubeChannelSchema = z
  .string()
  .trim()
  .nonempty({ message: "Wklej URL kanału YouTube lub @uchwyt" })
  .max(500, { message: "URL za długi" })
  .refine(
    (v) =>
      /^@[\w.-]{2,40}$/.test(v) ||
      /^(https?:\/\/)?(www\.)?youtube\.com\/(@[\w.-]+|c\/[\w.-]+|channel\/UC[\w-]{20,})/i.test(v),
    { message: "To nie wygląda na URL kanału YouTube lub @uchwyt" },
  );

const singleVideoSchema = z
  .string()
  .trim()
  .nonempty({ message: "Wklej URL filmu" })
  .max(500)
  .refine(
    (v) =>
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i.test(v) ||
      /^(https?:\/\/)?(www\.)?rumble\.com\/[\w-]+/i.test(v),
    { message: "Musi być URL filmu YouTube lub Rumble" },
  );

const spotifySchema = z
  .string()
  .trim()
  .nonempty({ message: "Wklej URL audycji Spotify" })
  .max(500)
  .refine((v) => /^(https?:\/\/)?open\.spotify\.com\/show\/[\w]+/i.test(v), {
    message: "Musi być URL audycji Spotify",
  });

const optionalText = (max: number) =>
  z.string().trim().max(max, { message: `Maks ${max} znaków` }).optional();

const overrideSchema = z.object({
  nameOverride: optionalText(100),
  traitOverride: optionalText(120),
});

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
type SourceCardId = "youtube_channel" | "youtube_video" | "spotify" | "upload";

interface UploadedFile {
  id: string;
  name: string;
  sizeMB: number;
  /** 0..100 fake progress so the UI feels alive */
  progress: number;
}

const MAX_TOTAL_MB = 500;
const ACCEPTED_EXT = [".mp3", ".mp4", ".wav", ".m4a", ".webm"];

// ───────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────

export default function SpeakerImport() {
  const navigate = useNavigate();
  const { mutate: createImport, isPending } = useCreateImportJob();
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<SourceCardId | null>(null);

  // Form state per source
  const [channelUrl, setChannelUrl] = useState("");
  const [channelVideoCount, setChannelVideoCount] = useState<5 | 10 | 25 | 50 | 100>(25);
  const [videoUrl, setVideoUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [spotifyEpisodes, setSpotifyEpisodes] = useState<3 | 5 | 10 | 20>(5);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Step 3 state
  const [detectedName, setDetectedName] = useState("");
  const [categoryChoice, setCategoryChoice] = useState<CategoryId | "auto">("auto");
  const [nameOverride, setNameOverride] = useState("");
  const [traitOverride, setTraitOverride] = useState("");

  // ── Step 1 → 2
  const pickSource = (id: SourceCardId) => {
    setSource(id);
    setError(null);
    setStep(2);
  };

  // ── Step 2 → 3
  const submitStep2 = () => {
    setError(null);
    let parsed: ReturnType<typeof youtubeChannelSchema.safeParse> | null = null;
    let resolvedName = "";

    if (source === "youtube_channel") {
      parsed = youtubeChannelSchema.safeParse(channelUrl);
      if (parsed.success) {
        const handle = parsed.data.match(/@([\w.-]+)/)?.[1];
        resolvedName = handle ? `@${handle}` : "Detected YouTube Channel";
      }
    } else if (source === "youtube_video") {
      parsed = singleVideoSchema.safeParse(videoUrl);
      if (parsed.success) resolvedName = "Detected Video";
    } else if (source === "spotify") {
      parsed = spotifySchema.safeParse(spotifyUrl);
      if (parsed.success) resolvedName = "Detected Spotify Show";
    } else if (source === "upload") {
      if (files.length === 0) {
        setError("Add at least one file");
        return;
      }
      const total = files.reduce((s, f) => s + f.sizeMB, 0);
      if (total > MAX_TOTAL_MB) {
        setError(`Total size ${total.toFixed(0)}MB exceeds ${MAX_TOTAL_MB}MB limit`);
        return;
      }
      resolvedName = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : `${files.length} files`;
    }

    if (parsed && !parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setDetectedName(resolvedName);
    setStep(3);
  };

  // ── Step 3 → submit
  const startImport = () => {
    const overrides = overrideSchema.safeParse({ nameOverride, traitOverride });
    if (!overrides.success) {
      toast.error(overrides.error.issues[0]?.message ?? "Invalid override");
      return;
    }

    let sourceType: 'youtube_channel' | 'youtube_video' | 'rumble' | 'spotify' | 'upload';
    let sourceUrl: string;
    let numVideos: number | undefined;

    if (source === 'youtube_channel') {
      sourceType = 'youtube_channel';
      sourceUrl = channelUrl;
      numVideos = channelVideoCount;
    } else if (source === 'youtube_video') {
      sourceType = 'youtube_video';
      sourceUrl = videoUrl;
      numVideos = 1;
    } else if (source === 'spotify') {
      sourceType = 'spotify';
      sourceUrl = spotifyUrl;
      numVideos = spotifyEpisodes;
    } else {
      // upload - not yet supported by backend
      toast.error("Upload functionality coming soon");
      return;
    }

    createImport({
      source_type: sourceType,
      source_url: sourceUrl,
      num_videos: numVideos,
      target_category_id: categoryChoice === 'auto' ? null : categoryChoice,
      custom_name: nameOverride.trim() || null,
      custom_trait: traitOverride.trim() || null,
    }, {
      onSuccess: () => {
        setTimeout(() => navigate("/speakers/imports"), 600);
      }
    });
  };

  const reset = () => {
    setStep(1);
    setSource(null);
    setError(null);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-10 lg:py-14 space-y-8 animate-page-in">
        {/* Top bar with breadcrumb + step indicator */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step === 1 ? navigate("/speakers") : reset())}
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step === 1 ? "Back to library" : "Start over"}
          </button>
          <StepDots step={step} />
        </div>

        {step === 1 && <Step1 onPick={pickSource} />}
        {step === 2 && source && (
          <Step2
            source={source}
            error={error}
            channelUrl={channelUrl}
            setChannelUrl={setChannelUrl}
            channelVideoCount={channelVideoCount}
            setChannelVideoCount={setChannelVideoCount}
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            spotifyUrl={spotifyUrl}
            setSpotifyUrl={setSpotifyUrl}
            spotifyEpisodes={spotifyEpisodes}
            setSpotifyEpisodes={setSpotifyEpisodes}
            files={files}
            setFiles={setFiles}
            onBack={() => setStep(1)}
            onContinue={submitStep2}
          />
        )}
        {step === 3 && source && (
          <Step3
            source={source}
            detectedName={detectedName}
            videoCount={
              source === "youtube_channel"
                ? channelVideoCount
                : source === "spotify"
                  ? spotifyEpisodes
                  : source === "upload"
                    ? files.length
                    : 1
            }
            categoryChoice={categoryChoice}
            setCategoryChoice={setCategoryChoice}
            nameOverride={nameOverride}
            setNameOverride={setNameOverride}
            traitOverride={traitOverride}
            setTraitOverride={setTraitOverride}
            onBack={() => setStep(2)}
            onStart={startImport}
            isPending={isPending}
          />
        )}
      </div>
    </AppShell>
  );
}

// ───────────────────────────────────────────────────────────────
// Step indicator
// ───────────────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            "h-1.5 rounded-full transition-all",
            n === step ? "w-8 bg-gradient-primary" : n < step ? "w-4 bg-primary/40" : "w-4 bg-muted",
          )}
        />
      ))}
      <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Step {step}/3
      </span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// STEP 1 — Source selection
// ───────────────────────────────────────────────────────────────

const SOURCE_CARDS: {
  id: SourceCardId;
  title: string;
  desc: string;
  icon: typeof Youtube;
  tint: string;
  glow: string;
}[] = [
  {
    id: "youtube_channel",
    title: "YouTube Channel",
    desc: "Import a creator's full library. Best for ongoing lessons.",
    icon: Youtube,
    tint: "0 85% 60%",
    glow: "0 90% 70%",
  },
  {
    id: "youtube_video",
    title: "Single Video",
    desc: "One YouTube or Rumble link. Quick analysis.",
    icon: PlayCircle,
    tint: "200 85% 55%",
    glow: "200 95% 65%",
  },
  {
    id: "spotify",
    title: "Podcast / Spotify",
    desc: "Spotify show URL. We analyze recent episodes.",
    icon: Mic,
    tint: "142 65% 50%",
    glow: "152 75% 60%",
  },
  {
    id: "upload",
    title: "Upload Audio/Video",
    desc: "MP3, MP4, WAV, M4A. Up to 500MB.",
    icon: Upload,
    tint: "270 75% 60%",
    glow: "280 85% 70%",
  },
];

function Step1({ onPick }: { onPick: (id: SourceCardId) => void }) {
  return (
    <section className="space-y-8 animate-fade-in-up">
      <header className="text-center max-w-2xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
          Custom Import
        </div>
        <h1 className="font-display text-4xl md:text-5xl mb-3">
          Train Against <span className="text-gradient-primary">Anyone</span>
        </h1>
        <p className="text-muted-foreground">
          Pick a source. Our AI will study their style and create your training profile.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOURCE_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="card-premium p-6 text-left group relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-25 group-hover:opacity-50 transition-opacity"
                style={{ background: `hsl(${c.tint})` }}
                aria-hidden
              />
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 shadow-elegant"
                style={{
                  background: `linear-gradient(135deg, hsl(${c.tint}), hsl(${c.glow}))`,
                  color: "white",
                }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              <ChevronRight className="absolute bottom-5 right-5 h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">
        We respect platform terms. We only import publicly available content with available
        transcripts. Some channels may be unavailable.
      </p>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// STEP 2 — Source-specific form
// ───────────────────────────────────────────────────────────────

interface Step2Props {
  source: SourceCardId;
  error: string | null;
  channelUrl: string;
  setChannelUrl: (v: string) => void;
  channelVideoCount: 5 | 10 | 25 | 50 | 100;
  setChannelVideoCount: (v: 5 | 10 | 25 | 50 | 100) => void;
  videoUrl: string;
  setVideoUrl: (v: string) => void;
  spotifyUrl: string;
  setSpotifyUrl: (v: string) => void;
  spotifyEpisodes: 3 | 5 | 10 | 20;
  setSpotifyEpisodes: (v: 3 | 5 | 10 | 20) => void;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onBack: () => void;
  onContinue: () => void;
}

const VIDEO_COUNT_STEPS = [5, 10, 25, 50, 100] as const;
const EPISODE_STEPS = [3, 5, 10, 20] as const;

const SOURCE_TITLES: Record<SourceCardId, string> = {
  youtube_channel: "Import a YouTube channel",
  youtube_video: "Import a single video",
  spotify: "Import a Spotify show",
  upload: "Upload audio or video",
};

function Step2(props: Step2Props) {
  const { source, error, onBack, onContinue } = props;

  return (
    <section className="space-y-6 animate-fade-in-up">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
          Source Details
        </div>
        <h2 className="font-display text-3xl">{SOURCE_TITLES[source]}</h2>
      </header>

      <div className="card-premium p-7 space-y-6">
        {source === "youtube_channel" && <YouTubeChannelForm {...props} />}
        {source === "youtube_video" && <SingleVideoForm {...props} />}
        {source === "spotify" && <SpotifyForm {...props} />}
        {source === "upload" && <UploadForm {...props} />}

        {error && (
          <p
            role="alert"
            className="text-sm text-destructive font-medium px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="ghost-dark" size="lg" className="sm:flex-none" onClick={onBack}>
          Back
        </Button>
        <Button variant="fire" size="lg" className="flex-1" onClick={onContinue}>
          Continue
          <ChevronRight />
        </Button>
      </div>
    </section>
  );
}

function YouTubeChannelForm({
  channelUrl,
  setChannelUrl,
  channelVideoCount,
  setChannelVideoCount,
}: Step2Props) {
  const idx = VIDEO_COUNT_STEPS.indexOf(channelVideoCount);
  const eta = Math.max(2, Math.round((channelVideoCount / 10) * 3));
  return (
    <>
      <div>
        <Label htmlFor="yt-channel" className="mb-2 block">
          YouTube channel URL or @handle
        </Label>
        <Input
          id="yt-channel"
          autoFocus
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          placeholder="https://youtube.com/@AlexHormozi"
          maxLength={500}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>How many recent videos to analyze?</Label>
          <span className="font-mono text-sm tabular-nums text-foreground">
            {channelVideoCount}
          </span>
        </div>
        <Slider
          value={[idx]}
          min={0}
          max={VIDEO_COUNT_STEPS.length - 1}
          step={1}
          onValueChange={([v]) => setChannelVideoCount(VIDEO_COUNT_STEPS[v])}
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          {VIDEO_COUNT_STEPS.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          ~{eta} min total (≈2-5 min per 10 videos)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Live streams and Shorts will be skipped
        </span>
      </div>
    </>
  );
}

function SingleVideoForm({ videoUrl, setVideoUrl }: Step2Props) {
  return (
    <div>
      <Label htmlFor="video-url" className="mb-2 block">
        Video URL (YouTube or Rumble)
      </Label>
      <Input
        id="video-url"
        autoFocus
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        maxLength={500}
      />
      <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Usually ready in ~2 minutes
      </p>
    </div>
  );
}

function SpotifyForm({ spotifyUrl, setSpotifyUrl, spotifyEpisodes, setSpotifyEpisodes }: Step2Props) {
  const idx = EPISODE_STEPS.indexOf(spotifyEpisodes);
  return (
    <>
      <div>
        <Label htmlFor="spotify-url" className="mb-2 block">
          Spotify show URL
        </Label>
        <Input
          id="spotify-url"
          autoFocus
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          placeholder="https://open.spotify.com/show/..."
          maxLength={500}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>How many recent episodes?</Label>
          <span className="font-mono text-sm tabular-nums">{spotifyEpisodes}</span>
        </div>
        <Slider
          value={[idx]}
          min={0}
          max={EPISODE_STEPS.length - 1}
          step={1}
          onValueChange={([v]) => setSpotifyEpisodes(EPISODE_STEPS[v])}
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          {EPISODE_STEPS.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
    </>
  );
}

function UploadForm({ files, setFiles }: Step2Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fake progress for visual life
  useEffect(() => {
    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => (f.progress < 100 ? { ...f, progress: Math.min(100, f.progress + 8) } : f)),
      );
    }, 200);
    return () => clearInterval(interval);
  }, [setFiles]);

  const totalMB = files.reduce((s, f) => s + f.sizeMB, 0);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: UploadedFile[] = [];
    for (const f of Array.from(incoming)) {
      const ext = f.name.toLowerCase().match(/\.[^.]+$/)?.[0];
      if (!ext || !ACCEPTED_EXT.includes(ext)) {
        toast.error(`${f.name}: unsupported file type`);
        continue;
      }
      const sizeMB = f.size / (1024 * 1024);
      next.push({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        sizeMB,
        progress: 0,
      });
    }
    if (next.length === 0) return;
    setFiles((prev) => {
      const combined = [...prev, ...next];
      const total = combined.reduce((s, f) => s + f.sizeMB, 0);
      if (total > MAX_TOTAL_MB) {
        toast.error(`Total exceeds ${MAX_TOTAL_MB}MB limit`);
        return prev;
      }
      return combined;
    });
  };

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-foreground font-medium mb-1">
          Drag & drop files, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          {ACCEPTED_EXT.join(", ")} · max {MAX_TOTAL_MB}MB total
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>{files.length} file{files.length === 1 ? "" : "s"}</span>
            <span className="tabular-nums">
              {totalMB.toFixed(1)} / {MAX_TOTAL_MB} MB
            </span>
          </div>
          {files.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between mb-2 gap-3">
                <div className="min-w-0">
                  <div className="text-sm truncate">{f.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {f.sizeMB.toFixed(1)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all"
                  style={{ width: `${f.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────
// STEP 3 — Preview & categorize
// ───────────────────────────────────────────────────────────────

function Step3({
  source,
  detectedName,
  videoCount,
  categoryChoice,
  setCategoryChoice,
  nameOverride,
  setNameOverride,
  traitOverride,
  setTraitOverride,
  onBack,
  onStart,
  isPending,
}: {
  source: SourceCardId;
  detectedName: string;
  videoCount: number;
  categoryChoice: CategoryId | "auto";
  setCategoryChoice: (v: CategoryId | "auto") => void;
  nameOverride: string;
  setNameOverride: (v: string) => void;
  traitOverride: string;
  setTraitOverride: (v: string) => void;
  onBack: () => void;
  onStart: () => void;
  isPending: boolean;
}) {
  const finalName = nameOverride.trim() || detectedName;
  const monogram = useMemo(
    () =>
      finalName
        .replace(/^@/, "")
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("") || "?",
    [finalName],
  );

  const sourceLabels: Record<SourceCardId, string> = {
    youtube_channel: `${videoCount} videos`,
    youtube_video: "1 video",
    spotify: `${videoCount} episodes`,
    upload: `${videoCount} file${videoCount === 1 ? "" : "s"}`,
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
          Confirm & Categorize
        </div>
        <h2 className="font-display text-3xl">Review your import</h2>
      </header>

      {/* Detected channel preview */}
      <div className="card-premium p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center font-mono text-xl font-bold text-primary-foreground shadow-elegant shrink-0">
          {monogram}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            We'll create a profile for
          </div>
          <div className="font-display text-2xl truncate">{finalName}</div>
          <div className="text-xs text-muted-foreground mt-1">{sourceLabels[source]}</div>
        </div>
      </div>

      {/* Category */}
      <div className="card-premium p-6 space-y-5">
        <div>
          <Label className="mb-2 block">Choose a category</Label>
          <Select value={categoryChoice} onValueChange={(v) => setCategoryChoice(v as CategoryId | "auto")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Let AI decide
                </span>
              </SelectItem>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: `hsl(var(--${c.accentVar}))` }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="name-override" className="mb-2 block">
            Custom name <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="name-override"
            value={nameOverride}
            onChange={(e) => setNameOverride(e.target.value)}
            placeholder={detectedName}
            maxLength={100}
          />
        </div>

        <div>
          <Label htmlFor="trait-override" className="mb-2 block">
            Custom signature trait <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="trait-override"
            value={traitOverride}
            onChange={(e) => setTraitOverride(e.target.value)}
            placeholder="e.g. Master of the pause"
            maxLength={120}
          />
        </div>
      </div>

      {/* What happens next */}
      <div className="rounded-xl p-6 border border-primary/30 bg-primary/5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
          What happens next
        </div>
        <ol className="space-y-2 text-sm text-foreground/90">
          <li>
            <span className="font-mono text-primary mr-2">1.</span>
            We'll fetch transcripts of {sourceLabels[source]}
          </li>
          <li>
            <span className="font-mono text-primary mr-2">2.</span>
            Our AI will analyze their speaking style
          </li>
          <li>
            <span className="font-mono text-primary mr-2">3.</span>
            We'll generate a full training profile
          </li>
          <li>
            <span className="font-mono text-primary mr-2">4.</span>
            You'll be notified when ready (~5–15 min)
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          You can keep using the app — this runs in the background.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="ghost-dark" size="lg" onClick={onBack} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="fire" size="lg" className="flex-1" onClick={onStart} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              Start Import
              <ChevronRight />
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
