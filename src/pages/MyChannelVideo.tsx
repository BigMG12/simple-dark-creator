import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Video, Calendar, TrendingUp, Zap, Loader2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { useMyImportedSpeakers } from "@/hooks/queries";

export default function MyChannelVideo() {
  const { speakerId } = useParams<{ speakerId: string }>();
  const { data: speakers = [], isLoading, error } = useMyImportedSpeakers();

  const speaker = speakers.find(s => s.id === speakerId);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !speaker) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          <div className="card-premium p-10 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="font-display text-xl mb-2">Nie znaleziono mówcy</p>
            <p className="text-sm text-muted-foreground mb-6">
              {error?.message || "Mówca o podanym ID nie istnieje."}
            </p>
            <Link to="/my-channel">
              <Button variant="ghost-dark">
                <ArrowLeft className="h-4 w-4" /> Powrót do kanału
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const styleTraits = Array.isArray(speaker.style_traits) ? speaker.style_traits : [];
  const commonThemes = Array.isArray(speaker.common_themes) ? speaker.common_themes : [];
  const persuasionTechniques = Array.isArray(speaker.persuasion_techniques) ? speaker.persuasion_techniques : [];
  const signaturePhrases = Array.isArray(speaker.signature_phrases) ? speaker.signature_phrases : [];
  const learnings = Array.isArray(speaker.learnings) ? speaker.learnings : [];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-8">
        <Link
          to="/my-channel"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Powrót do kanału
        </Link>

        <header className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-3xl shadow-elegant shrink-0">
              {speaker.monogram}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-4xl lg:text-5xl tracking-tight mb-2">
                {speaker.name}
              </h1>
              <p className="text-muted-foreground text-sm">{speaker.specialty}</p>
            </div>
          </div>
        </header>

        <div className="card-premium p-6">
          <h2 className="font-display text-xl mb-3">O mówcy</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{speaker.bio}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-premium p-5 text-center">
            <Video className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-mono tabular-nums mb-1">{speaker.video_count_analyzed}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Przeanalizowanych wideo</p>
          </div>
          <div className="card-premium p-5 text-center">
            <Calendar className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-mono tabular-nums mb-1">{Math.round(speaker.transcribed_minutes)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Minut transkrypcji</p>
          </div>
          <div className="card-premium p-5 text-center">
            <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-mono tabular-nums mb-1">{speaker.ideal_wpm_min}–{speaker.ideal_wpm_max}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Słów na minutę</p>
          </div>
        </div>

        <div className="card-premium p-6 space-y-4">
          <h2 className="font-display text-xl">Profil stylu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Profil energii
              </p>
              <p className="text-sm">{speaker.energy_profile}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Częstotliwość pauz
              </p>
              <p className="text-sm">{speaker.ideal_pause_frequency}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Cecha charakterystyczna
              </p>
              <p className="text-sm">{speaker.signature_trait}</p>
            </div>
            {speaker.perfect_for && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Idealny dla
                </p>
                <p className="text-sm">{speaker.perfect_for}</p>
              </div>
            )}
          </div>
        </div>

        {styleTraits.length > 0 && (
          <div className="card-premium p-6">
            <h2 className="font-display text-xl mb-4">Cechy stylu</h2>
            <div className="flex flex-wrap gap-2">
              {styleTraits.map((trait, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-xs font-mono bg-gradient-primary/10 text-primary border border-primary/20"
                >
                  {String(trait)}
                </span>
              ))}
            </div>
          </div>
        )}

        {commonThemes.length > 0 && (
          <div className="card-premium p-6">
            <h2 className="font-display text-xl mb-4">Wspólne tematy</h2>
            <div className="flex flex-wrap gap-2">
              {commonThemes.map((theme, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-xs bg-surface border border-border text-foreground"
                >
                  {String(theme)}
                </span>
              ))}
            </div>
          </div>
        )}

        {persuasionTechniques.length > 0 && (
          <div className="card-premium p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-accent" />
              <h2 className="font-display text-xl">Techniki perswazji</h2>
            </div>
            <ul className="space-y-2">
              {persuasionTechniques.map((technique, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>{String(technique)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {signaturePhrases.length > 0 && (
          <div className="card-premium p-6">
            <h2 className="font-display text-xl mb-4">Charakterystyczne zwroty</h2>
            <div className="space-y-2">
              {signaturePhrases.map((phrase, i) => (
                <p key={i} className="text-sm italic text-foreground/70 border-l-2 border-primary/30 pl-3">
                  "{String(phrase)}"
                </p>
              ))}
            </div>
          </div>
        )}

        {learnings.length > 0 && (
          <div className="card-premium p-6">
            <h2 className="font-display text-xl mb-4">Kluczowe lekcje</h2>
            <ul className="space-y-3">
              {learnings.map((learning, i) => (
                <li key={i} className="text-sm text-foreground/80 leading-relaxed flex items-start gap-2">
                  <span className="text-success font-mono mt-0.5">{i + 1}.</span>
                  <span>{String(learning)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {speaker.source_url && (
          <div className="flex justify-center pt-4">
            <Button asChild variant="ghost-dark" size="lg">
              <a href={speaker.source_url} target="_blank" rel="noopener noreferrer">
                Zobacz oryginalny kanał <ArrowLeft className="h-4 w-4 rotate-180" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
