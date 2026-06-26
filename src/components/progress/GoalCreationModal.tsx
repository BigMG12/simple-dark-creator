import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Sparkles, Target, Activity, GraduationCap, MessageSquare, Trophy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type GoalType = "score" | "metric" | "activity" | "mentor" | "conversation";
type GoalDraft = {
  title: string;
  metricKey?: string;
  targetValue: number;
  deadline: string;
  type?: GoalType;
  mode?: "average" | "peak";
  unit?: string;
  mentorId?: string;
  description?: string;
};

// Legacy mock — empty list; mentor selection now comes from useMentor / DB.
const SPEAKERS: { id: string; name: string; avatar?: string; specialty?: string }[] = [];

const TYPE_OPTIONS: {
  id: GoalType;
  label: string;
  description: string;
  icon: typeof Target;
}[] = [
  { id: "score", label: "Score-based", description: "Aim for an average or peak score.", icon: Trophy },
  { id: "metric", label: "Metric-based", description: "Improve WPM, clarity, filler density.", icon: Target },
  { id: "activity", label: "Activity-based", description: "Record X times, complete X drills, streak.", icon: Activity },
  { id: "mentor", label: "Mentor-based", description: "Reach a style match with a specific mentor.", icon: GraduationCap },
  { id: "conversation", label: "Conversation-based", description: "Ace a sales call, meeting, or interview.", icon: MessageSquare },
];

const SCORE_METRICS = [
  { key: "overall_score", label: "Overall Score", min: 50, max: 100, suggested: 82, unit: "" },
  { key: "clarity", label: "Clarity", min: 50, max: 100, suggested: 85, unit: "" },
  { key: "energy", label: "Energy Variance", min: 50, max: 100, suggested: 80, unit: "" },
  { key: "pause", label: "Pause Mastery", min: 50, max: 100, suggested: 80, unit: "" },
];

const METRIC_OPTIONS = [
  { key: "wpm", label: "WPM", min: 100, max: 180, suggested: 145, unit: "wpm", invert: false },
  { key: "filler", label: "Filler Density", min: 0, max: 30, suggested: 12, unit: "%", invert: true },
  { key: "vocab", label: "Vocabulary Depth", min: 50, max: 100, suggested: 75, unit: "" },
];

const ACTIVITY_OPTIONS = [
  { key: "recordings", label: "Recordings", min: 5, max: 100, suggested: 30, unit: "recordings" },
  { key: "drills", label: "Drills", min: 5, max: 100, suggested: 20, unit: "drills" },
  { key: "streak", label: "Streak", min: 7, max: 90, suggested: 21, unit: "days" },
];

const CONVO_OPTIONS = [
  { key: "convo_score_sales", label: "Sales Call Score", min: 60, max: 100, suggested: 85, unit: "" },
  { key: "convo_score_meeting", label: "Meeting Score", min: 60, max: 100, suggested: 80, unit: "" },
  { key: "convo_score_interview", label: "Interview Score", min: 60, max: 100, suggested: 85, unit: "" },
];

const DEADLINE_PRESETS = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "custom", label: "Custom", days: 0 },
];

interface GoalCreationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: GoalDraft) => void;
}

export function GoalCreationModal({ open, onClose, onCreate }: GoalCreationModalProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<GoalType | null>(null);
  const [metricKey, setMetricKey] = useState<string>("");
  const [mode, setMode] = useState<"average" | "peak">("average");
  const [target, setTarget] = useState<number>(0);
  const [mentorId, setMentorId] = useState<string>(SPEAKERS[0]?.id ?? "");
  const [mentorMatch, setMentorMatch] = useState(80);
  const [deadlinePreset, setDeadlinePreset] = useState("30");
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setStep(1);
    setType(null);
    setMetricKey("");
    setTarget(0);
    setMentorMatch(80);
    setDeadlinePreset("30");
    setCustomDate(undefined);
    setName("");
    setDescription("");
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const currentOptions = useMemo(() => {
    if (type === "score") return SCORE_METRICS;
    if (type === "metric") return METRIC_OPTIONS;
    if (type === "activity") return ACTIVITY_OPTIONS;
    if (type === "conversation") return CONVO_OPTIONS;
    return [];
  }, [type]);

  const selectedOption = currentOptions.find((o) => o.key === metricKey);
  const selectedMentor = SPEAKERS.find((s) => s.id === mentorId);

  const deadlineDate = useMemo(() => {
    if (deadlinePreset === "custom") return customDate ?? new Date(Date.now() + 30 * 86400000);
    const days = Number(deadlinePreset);
    return new Date(Date.now() + days * 86400000);
  }, [deadlinePreset, customDate]);

  const autoName = useMemo(() => {
    const dl = format(deadlineDate, "MMM d");
    if (type === "mentor" && selectedMentor) return `Reach ${mentorMatch}% match with ${selectedMentor.name} by ${dl}`;
    if (selectedOption) {
      const verb = type === "activity" ? "Complete" : type === "score" ? `Reach ${mode}` : "Hit";
      return `${verb} ${target}${selectedOption.unit ? selectedOption.unit : ""} ${selectedOption.label} by ${dl}`;
    }
    return "";
  }, [type, selectedOption, selectedMentor, mentorMatch, target, mode, deadlineDate]);

  const handleType = (t: GoalType) => {
    setType(t);
    if (t === "score") {
      setMetricKey("overall_score");
      setTarget(82);
    } else if (t === "metric") {
      setMetricKey("wpm");
      setTarget(145);
    } else if (t === "activity") {
      setMetricKey("recordings");
      setTarget(30);
    } else if (t === "conversation") {
      setMetricKey("convo_score_sales");
      setTarget(85);
    }
    setStep(2);
  };

  const canContinueStep2 =
    type === "mentor" ? !!mentorId && mentorMatch > 0 : !!metricKey && target > 0;

  const handleCreate = () => {
    if (!type) return;
    const finalName = name.trim() || autoName;
    const draft: GoalDraft = {
      type,
      metricKey: type === "mentor" ? mentorId : metricKey,
      mode: type === "score" ? mode : undefined,
      targetValue: type === "mentor" ? mentorMatch : target,
      unit: selectedOption?.unit,
      mentorId: type === "mentor" ? mentorId : undefined,
      deadline: deadlineDate.toISOString(),
      title: finalName,
      description: description.trim() || undefined,
    };
    onCreate(draft);
    toast.success("Goal created — let's go.");
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-surface border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Step {step} of 4
            </span>
          </div>
          <DialogTitle className="font-display text-2xl">
            {step === 1 && "What kind of goal?"}
            {step === 2 && "Set the target"}
            {step === 3 && "When?"}
            {step === 4 && "Review & create"}
          </DialogTitle>
          <DialogDescription className="sr-only">Create a new goal</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleType(opt.id)}
                  className="w-full text-left p-4 rounded-lg border border-border bg-background hover:border-accent hover:bg-accent/5 transition-all group flex items-center gap-3"
                >
                  <span className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && type && (
          <div className="space-y-5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs">
                <span className="text-accent font-medium">AI suggestion:</span>{" "}
                {type === "mentor"
                  ? `Based on your style, try 80% match with ${SPEAKERS[0]?.name}.`
                  : `Based on your recent stats, aim for ${selectedOption?.suggested}${selectedOption?.unit ?? ""} ${selectedOption?.label}.`}
              </p>
            </div>

            {type === "mentor" ? (
              <>
                <div className="space-y-2">
                  <Label>Mentor</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {SPEAKERS.slice(0, 8).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setMentorId(s.id)}
                        className={cn(
                          "p-2 rounded-lg border text-left text-xs transition-all",
                          mentorId === s.id
                            ? "border-accent bg-accent/10"
                            : "border-border bg-background hover:border-foreground/30",
                        )}
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-muted-foreground text-[10px]">{s.specialty}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Target match</Label>
                    <span className="font-mono text-xl text-gradient-gold">{mentorMatch}%</span>
                  </div>
                  <Slider
                    min={50}
                    max={100}
                    step={5}
                    value={[mentorMatch]}
                    onValueChange={(v) => setMentorMatch(v[0])}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setMetricKey(opt.key);
                          setTarget(opt.suggested);
                        }}
                        className={cn(
                          "p-2.5 rounded-lg border text-left text-xs transition-all",
                          metricKey === opt.key
                            ? "border-accent bg-accent/10"
                            : "border-border bg-background hover:border-foreground/30",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {type === "score" && (
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["average", "peak"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={cn(
                            "p-2.5 rounded-lg border text-xs capitalize transition-all",
                            mode === m
                              ? "border-accent bg-accent/10"
                              : "border-border bg-background hover:border-foreground/30",
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOption && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Target value</Label>
                      <span className="font-mono text-2xl text-gradient-gold">
                        {target}
                        <span className="text-sm text-muted-foreground ml-1">{selectedOption.unit}</span>
                      </span>
                    </div>
                    <Slider
                      min={selectedOption.min}
                      max={selectedOption.max}
                      step={1}
                      value={[target]}
                      onValueChange={(v) => setTarget(v[0])}
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{selectedOption.min}</span>
                      <span>{selectedOption.max}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {DEADLINE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDeadlinePreset(p.id)}
                  className={cn(
                    "p-3 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all",
                    deadlinePreset === p.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {deadlinePreset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(d) => d < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
            <div className="text-center p-4 rounded-lg bg-background border border-border">
              <p className="text-xs uppercase font-mono text-muted-foreground tracking-wider mb-1">Deadline</p>
              <p className="font-display text-xl">{format(deadlineDate, "EEEE, MMMM d")}</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input
                id="goal-name"
                value={name || autoName}
                onChange={(e) => setName(e.target.value)}
                placeholder={autoName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Description (optional)</Label>
              <Textarea
                id="goal-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why this goal matters..."
                rows={3}
              />
            </div>
            <div className="p-4 rounded-lg bg-background border border-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Type</span>
                <span className="font-mono capitalize">{type}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Target</span>
                <span className="font-mono">
                  {type === "mentor"
                    ? `${mentorMatch}% — ${selectedMentor?.name}`
                    : `${target}${selectedOption?.unit ?? ""} ${selectedOption?.label ?? ""}`}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-mono">{format(deadlineDate, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step < 4 && step > 1 && (
            <Button
              variant="fire"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && !canContinueStep2}
            >
              Continue
            </Button>
          )}
          {step === 4 && (
            <Button variant="fire" onClick={handleCreate}>
              Create Goal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
