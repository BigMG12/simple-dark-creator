import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResultsActions() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full">
      <Button
        variant="fire"
        size="lg"
        onClick={() => navigate("/record")}
        className="flex-1 gap-2"
      >
        <Flame className="h-5 w-5" />
        Spróbuj ponownie
      </Button>
      <Button
        variant="gold"
        size="lg"
        onClick={() => navigate("/drills")}
        className="flex-1 gap-2"
      >
        <Zap className="h-5 w-5" />
        Rozpocznij dzienne ćwiczenie
      </Button>
      <Button
        variant="ghost-dark"
        size="lg"
        onClick={() => navigate("/dashboard")}
        className="flex-1 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do panelu
      </Button>
    </div>
  );
}
