interface CountdownTimerProps {
  seconds: number;
  size?: 'sm' | 'md' | 'lg';
}

export function CountdownTimer({ seconds, size = 'lg' }: CountdownTimerProps) {
  const sizeClasses = {
    sm: 'text-4xl',
    md: 'text-6xl',
    lg: 'text-8xl',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`font-mono font-bold ${sizeClasses[size]}`}>
        {seconds}
      </div>
      <div className="text-sm text-muted-foreground">
        {seconds === 1 ? 'sekunda' : seconds < 5 ? 'sekundy' : 'sekund'}
      </div>
    </div>
  );
}
