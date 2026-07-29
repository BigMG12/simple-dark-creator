import { useState } from 'react';
import { SentenceAnalysis } from './types';
import { ProsodyBars } from './prosody/ProsodyBars';
import { Sparkles, Lightbulb, ArrowRight } from 'lucide-react';

interface Props {
  sentence: SentenceAnalysis;
  mentorName: string;
  mentorAvatar: string;
  mentorAccentColor?: string;
  onNext: () => void;
}

type View = 'commentary' | 'rewrite' | 'why' | 'explanation';

export function SentenceExpanded({
  sentence,
  mentorName,
  mentorAvatar,
  mentorAccentColor,
  onNext,
}: Props) {
  const [view, setView] = useState<View>('commentary');
  const accent = mentorAccentColor || 'hsl(var(--primary))';

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-3 items-start">
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {mentorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
            {mentorName} mówi
          </div>

          {view === 'commentary' && (
            <div className="space-y-2">
              <p className="text-base md:text-lg leading-relaxed italic" style={{ fontFamily: 'Georgia, serif' }}>
                "{sentence.mentor_commentary}"
              </p>
              {sentence.technique_tag && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest"
                  style={{ backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
                >
                  <Sparkles className="w-3 h-3" />
                  {sentence.technique_tag.replace(/-/g, ' ')}
                </div>
              )}
            </div>
          )}

          {view === 'rewrite' && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
                Lepsza wersja
              </div>
              <p
                className="text-base md:text-lg leading-relaxed italic px-4 py-3 rounded-lg"
                style={{ fontFamily: 'Georgia, serif', backgroundColor: `${accent}10`, borderLeft: `3px solid ${accent}` }}
              >
                "{sentence.rewrite || sentence.alternative}"
              </p>
            </div>
          )}

          {view === 'why' && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Jak mentor to widzi
              </div>
              <p className="text-sm md:text-base leading-relaxed text-foreground/85">
                {sentence.why_it_matters || sentence.explanation}
              </p>
            </div>
          )}

          {view === 'explanation' && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Dlaczego to wazne
              </div>
              <p className="text-sm md:text-base leading-relaxed text-foreground/85">
                {sentence.explanation}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pl-13">
        <ActionButton
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Lepsza wersja"
          active={view === 'rewrite'}
          onClick={() => setView('rewrite')}
        />
        <ActionButton
          icon={<Lightbulb className="w-3.5 h-3.5" />}
          label="Jak mentor to widzi"
          active={view === 'why'}
          onClick={() => setView('why')}
        />
        <ActionButton
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          label="Dalej"
          active={false}
          onClick={onNext}
        />
      </div>

      {sentence.prosody?.emotions_top5 && sentence.prosody.emotions_top5.length > 0 && (
        <ProsodyBars emotions={sentence.prosody.emotions_top5} />
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
        text-xs font-medium font-mono uppercase tracking-wider
        border transition
        ${active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-foreground border-border/40 hover:border-border hover:bg-muted'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
