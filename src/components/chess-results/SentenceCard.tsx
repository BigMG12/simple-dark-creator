import { SentenceAnalysis, LABEL_COLORS } from './types';
import { SentenceExpanded } from './SentenceExpanded';
import { AppleEmoji } from './prosody/AppleEmoji';

interface Props {
  sentence: SentenceAnalysis;
  mentorName: string;
  mentorAvatar: string;
  mentorAccentColor?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onNext: () => void;
}

export function SentenceCard({
  sentence,
  mentorName,
  mentorAvatar,
  mentorAccentColor,
  isExpanded,
  onToggle,
  onNext,
}: Props) {
  const colors = LABEL_COLORS[sentence.label];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div
      className={`
        rounded-xl border-l-4 transition
        ${colors.bg} ${colors.border}
        ${isExpanded ? 'ring-1 ring-foreground/15' : ''}
      `}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 md:p-5 flex items-start gap-3"
      >
        <div
          className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
          style={{ backgroundColor: colors.hex, color: '#fff' }}
        >
          {colors.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base md:text-lg leading-snug">
            "{sentence.text}"
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>
              {formatTime(sentence.start_seconds)} — {formatTime(sentence.end_seconds)}
            </span>
            <span>·</span>
            <span style={{ color: colors.hex }} className="font-semibold">
              {colors.text} · {sentence.score}/100
            </span>
            {sentence.prosody?.top_emotion && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-card rounded-full normal-case tracking-normal">
                <AppleEmoji emoji={sentence.prosody.emoji} size={14} />
                <span className="text-muted-foreground">{sentence.prosody.tag}</span>
              </span>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 md:px-5 pb-5">
          <SentenceExpanded
            sentence={sentence}
            mentorName={mentorName}
            mentorAvatar={mentorAvatar}
            mentorAccentColor={mentorAccentColor}
            onNext={onNext}
          />
        </div>
      )}
    </div>
  );
}
