import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function BrowserUnsupported() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="card-premium max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="font-display text-2xl mb-2">Przeglądarka nie jest obsługiwana</h1>
        <p className="text-muted-foreground mb-6">
          Nagrywanie audio nie jest dostępne w tej przeglądarce. Użyj najnowszej wersji Chrome, Edge lub Safari.
        </p>
        <Button variant="ghost-dark" onClick={() => navigate("/")}>Powrót do strony głównej</Button>
      </div>
    </div>
  );
}
