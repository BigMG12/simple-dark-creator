const Divider = ({ label }: { label: string }) => (
  <div className="my-5 flex items-center gap-3">
    <span className="h-px flex-1 bg-border" />
    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
    <span className="h-px flex-1 bg-border" />
  </div>
);

export default Divider;
