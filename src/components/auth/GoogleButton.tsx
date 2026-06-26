import { Button } from "@/components/ui/button";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.06-1.1-.16-1.6H12z"/>
    <path fill="#34A853" d="M3.9 7.6l3.2 2.4c.9-1.7 2.6-2.9 4.9-2.9 1.4 0 2.7.5 3.6 1.4l2.7-2.6C16.6 4.4 14.5 3.5 12 3.5 8.4 3.5 5.3 5.6 3.9 7.6z" opacity="0"/>
  </svg>
);

const GoogleButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <Button
    type="button"
    variant="ghost-dark"
    onClick={onClick}
    disabled={disabled}
    className="w-full border border-border bg-surface hover:bg-background"
  >
    <GoogleIcon />
    Kontynuuj z Google
  </Button>
);

export default GoogleButton;
