interface MentorOption {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Props {
  current: MentorOption;
  available: MentorOption[];
  onSwitch: (mentorId: string) => void;
  isLoading: boolean;
}

export function MentorSwitcher({ current, available, onSwitch, isLoading }: Props) {
  return (
    <div className="card-brutal p-5 space-y-4 sticky top-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Ten sam fragment, inna perspektywa
      </div>

      <div className="grid grid-cols-3 gap-2">
        {available.slice(0, 3).map((m) => {
          const isActive = m.id === current.id;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => !isActive && !isLoading && onSwitch(m.id)}
              disabled={isLoading || isActive}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-lg border transition
                ${isActive
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border/40 hover:border-border'}
                ${isLoading ? 'opacity-50 cursor-wait' : isActive ? '' : 'cursor-pointer'}
              `}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-mono text-[11px] font-bold text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.avatar}
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">
                {m.name.split(' ')[0]}
              </span>
              {isActive && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary">
                  aktywny
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="text-[11px] font-mono text-muted-foreground text-center">
          Generowanie perspektywy...
        </div>
      )}
    </div>
  );
}
