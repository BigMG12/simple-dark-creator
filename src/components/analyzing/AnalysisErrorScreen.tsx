import { useState } from "react";
import { AlertTriangle, Copy, Check, ArrowLeft, RotateCcw } from "lucide-react";
import type { AnalysisErrorInfo } from "@/lib/analysisErrors";

interface Props {
  info: AnalysisErrorInfo;
  onRetry: () => void;
  onBack: () => void;
}

export default function AnalysisErrorScreen({ info, onRetry, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  const diagnostics = [
    `Code: ${info.code}`,
    `Title: ${info.title}`,
    info.recordingId ? `Recording ID: ${info.recordingId}` : null,
    info.rawMessage ? `Raw: ${info.rawMessage}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden flex items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-destructive/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-8 shadow-glow">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                Błąd analizy · {info.code}
              </div>
              <h1 className="font-display text-2xl text-destructive leading-tight">
                {info.title}
              </h1>
            </div>
          </div>

          <div className="space-y-5 mb-8">
            <section>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                Powód
              </div>
              <p className="text-foreground leading-relaxed">{info.reason}</p>
            </section>

            <section>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                Co możesz zrobić
              </div>
              <p className="text-foreground/90 leading-relaxed">
                {info.suggestion}
              </p>
            </section>

            {(info.recordingId || info.rawMessage) && (
              <details className="group rounded-lg border border-border/60 bg-muted/30 p-4">
                <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground select-none">
                  Szczegóły techniczne
                </summary>
                <div className="mt-3 space-y-2 text-xs font-mono text-muted-foreground">
                  {info.recordingId && (
                    <div>
                      <span className="text-foreground/70">recording_id:</span>{" "}
                      <span className="break-all">{info.recordingId}</span>
                    </div>
                  )}
                  {info.rawMessage && (
                    <div className="break-words">
                      <span className="text-foreground/70">raw:</span>{" "}
                      {info.rawMessage}
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Spróbuj ponownie
            </button>
            <button
              onClick={onBack}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground hover:bg-muted/40 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Wróć
            </button>
            <button
              onClick={copyDiagnostics}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
              title="Skopiuj diagnostykę"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}