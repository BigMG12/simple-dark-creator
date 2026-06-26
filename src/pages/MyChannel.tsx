import { useState } from "react";
import { Link } from "react-router-dom";
import { Youtube, ArrowRight, Calendar, Video, Loader2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { useMyImportedSpeakers } from "@/hooks/queries";
import { cn } from "@/lib/utils";

export default function MyChannel() {
  const { data: speakers = [], isLoading, error } = useMyImportedSpeakers();
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

  const activeSpeaker = selectedSpeaker
    ? speakers.find(s => s.id === selectedSpeaker)
    : speakers[0];

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          <div className="card-premium p-10 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="font-display text-xl mb-2">Błąd ładowania</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (speakers.length === 0) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          <div className="card-premium p-12 text-center">
            <Youtube className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-display text-3xl mb-2">Mój kanał YouTube</h1>
            <p className="text-muted-foreground mb-6">
              Nie masz jeszcze żadnych zaimportowanych mówców. Zaimportuj kanał YouTube, aby zobaczyć swoje wideo.
            </p>
            <Link to="/speaker-imports">
              <Button variant="fire">
                Przejdź do importów <ArrowRight />
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-8">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tight">
              Mój <span className="text-gradient-primary">kanał</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Twoje zaimportowane wideo z YouTube
            </p>
          </div>
          <Button asChild variant="fire">
            <Link to="/speaker-imports">
              <Youtube className="h-4 w-4" /> Zarządzaj importami
            </Link>
          </Button>
        </header>

        {speakers.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {speakers.map((speaker) => (
              <button
                key={speaker.id}
                onClick={() => setSelectedSpeaker(speaker.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-mono whitespace-nowrap transition-all",
                  selectedSpeaker === speaker.id || (!selectedSpeaker && speaker.id === speakers[0].id)
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {speaker.name}
              </button>
            ))}
          </div>
        )}

        {activeSpeaker && (
          <div className="space-y-6">
            <div className="card-premium p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl shadow-elegant shrink-0">
                  {activeSpeaker.monogram}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-2xl mb-1">{activeSpeaker.name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{activeSpeaker.specialty}</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{activeSpeaker.bio}</p>

                  <div className="flex items-center gap-6 mt-4 text-xs font-mono text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5" />
                      {activeSpeaker.video_count_analyzed} wideo
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {Math.round(activeSpeaker.transcribed_minutes)} min transkrypcji
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium p-6">
              <h3 className="font-display text-lg mb-4">Cechy stylu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Tempo mowy
                  </p>
                  <p className="text-sm font-mono">
                    {activeSpeaker.ideal_wpm_min}–{activeSpeaker.ideal_wpm_max} słów/min
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Profil energii
                  </p>
                  <p className="text-sm">{activeSpeaker.energy_profile}</p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Częstotliwość pauz
                  </p>
                  <p className="text-sm">{activeSpeaker.ideal_pause_frequency}</p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Cecha charakterystyczna
                  </p>
                  <p className="text-sm">{activeSpeaker.signature_trait}</p>
                </div>
              </div>
            </div>

            {activeSpeaker.source_url && (
              <div className="flex justify-center">
                <Button asChild variant="ghost-dark">
                  <a href={activeSpeaker.source_url} target="_blank" rel="noopener noreferrer">
                    <Youtube className="h-4 w-4" /> Zobacz oryginalny kanał
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
