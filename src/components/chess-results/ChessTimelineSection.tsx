import { useState, useRef, useEffect, useCallback } from 'react';
import { SentenceAnalysis } from './types';
import { QualityMiniMap } from './QualityMiniMap';
import { SentenceCard } from './SentenceCard';
import { MentorSwitcher } from './MentorSwitcher';
import { ProsodyRadar } from './prosody/ProsodyRadar';

interface Props {
  sentences: SentenceAnalysis[];
  durationSeconds: number;
  mentorName: string;
  mentorAvatar: string;
  mentorAccentColor?: string;
  mentorId: string;
  prosodyRadar?: Record<string, number> | null;
  availableMentors?: Array<{
    id: string;
    name: string;
    avatar: string;
    color: string;
  }>;
  onMentorSwitch?: (mentorId: string) => void;
  switchingMentor?: boolean;
}

export function ChessTimelineSection({
  sentences,
  durationSeconds,
  mentorName,
  mentorAvatar,
  mentorAccentColor,
  mentorId,
  prosodyRadar,
  availableMentors = [],
  onMentorSwitch,
  switchingMentor = false,
}: Props) {

export function ChessTimelineSection({
  sentences,
  durationSeconds,
  mentorName,
  mentorAvatar,
  mentorAccentColor,
  mentorId,
  availableMentors = [],
  onMentorSwitch,
  switchingMentor = false,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const sentenceRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
    setTimeout(() => {
      sentenceRefs.current.get(index)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  }, []);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;
    for (let i = selectedIndex + 1; i < sentences.length; i++) {
      if (sentences[i].label === 'critical' || sentences[i].label === 'weak') {
        handleSelect(i);
        return;
      }
    }
    setSelectedIndex(null);
  }, [selectedIndex, sentences, handleSelect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (selectedIndex === null) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleSelect(Math.min(selectedIndex + 1, sentences.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleSelect(Math.max(selectedIndex - 1, 0));
      } else if (e.key === 'Escape') {
        setSelectedIndex(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, sentences.length, handleSelect]);

  if (!sentences || sentences.length === 0) return null;

  const current = availableMentors.find((m) => m.id === mentorId) || {
    id: mentorId,
    name: mentorName,
    avatar: mentorAvatar,
    color: mentorAccentColor || 'hsl(var(--primary))',
  };

  return (
    <section className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">
          Chess timeline
        </div>
        <h2 className="font-display text-3xl md:text-4xl">Zdanie po zdaniu</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {sentences.length} zdań · Kliknij na mapie lub w liście
        </p>
      </div>

      <QualityMiniMap
        sentences={sentences}
        durationSeconds={durationSeconds}
        selectedIndex={selectedIndex}
        onSelectSentence={handleSelect}
      />

      <div className={`grid gap-6 ${availableMentors.length > 0 && onMentorSwitch ? 'md:grid-cols-[1fr_260px]' : ''}`}>
        <div className="space-y-3">
          {sentences.map((s) => (
            <div
              key={s.index}
              ref={(el) => {
                if (el) sentenceRefs.current.set(s.index, el);
              }}
            >
              <SentenceCard
                sentence={s}
                mentorName={mentorName}
                mentorAvatar={mentorAvatar}
                mentorAccentColor={mentorAccentColor}
                isExpanded={selectedIndex === s.index}
                onToggle={() => handleSelect(s.index)}
                onNext={handleNext}
              />
            </div>
          ))}
        </div>

        {availableMentors.length > 0 && onMentorSwitch && (
          <aside>
            <MentorSwitcher
              current={current}
              available={availableMentors}
              onSwitch={onMentorSwitch}
              isLoading={switchingMentor}
            />
          </aside>
        )}
      </div>
    </section>
  );
}
