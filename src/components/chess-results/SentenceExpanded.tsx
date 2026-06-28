import { useState } from 'react';
import { SentenceAnalysis } from './types';
import { Sparkles, Lightbulb, ArrowRight } from 'lucide-react';

interface Props {
  sentence: SentenceAnalysis;
  mentorName: string;
  mentorAvatar: string;
  mentorAccentColor?: string;
  onNext: () => void;
}

type View = 'commentary' | 'alternative' | 'explanation';

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
            <p className="text-base md:text-lg leading-relaxed italic" style={{ fontFamily: 'Georgia, serif' }}>
              "{sentence.mentor_commentary}"
            </p>
          )}

          {view === 'alternative' && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
                Powiedz tak
              </div>
              <p
                className="text-base md:text-lg leading-relaxed italic px-4 py-3 rounded-lg"
                style={{ fontFamily: 'Georgia, serif', backgroundColor: `${accent}10`, borderLeft: `3px solid ${accent}` }}
              >
                "{sentence.alternative}"
              </p>
            </div>
          )}

          {view === 'explanation' && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Dlaczego to ważne
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
          label="Lepiej powiedz"
          active={view === 'alternative'}
          onClick={() => setView('alternative')}
        />
        <ActionButton
          icon={<Lightbulb className="w-3.5 h-3.5" />}
          label="Wytłumacz"
          active={view === 'explanation'}
          onClick={() => setView('explanation')}
        />
        <ActionButton
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          label="Dalej"
          active={false}
          onClick={onNext}
        />
      </div>
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
