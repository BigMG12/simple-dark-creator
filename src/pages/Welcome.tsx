import { useNavigate } from "react-router-dom";
import { Home, Mic, BarChart3, Users, Dumbbell, Swords, User } from "lucide-react";
import { CircleMenu } from "@/components/ui/circle-menu";

const items = [
  { label: "Dashboard", icon: <Home size={18} className="text-foreground" />, href: "/dashboard" },
  { label: "Nagraj", icon: <Mic size={18} className="text-foreground" />, href: "/record" },
  { label: "Postępy", icon: <BarChart3 size={18} className="text-foreground" />, href: "/progress" },
  { label: "Mówcy", icon: <Users size={18} className="text-foreground" />, href: "/speakers" },
  { label: "Drille", icon: <Dumbbell size={18} className="text-foreground" />, href: "/drills" },
  { label: "Sparring", icon: <Swords size={18} className="text-foreground" />, href: "/sparring" },
  { label: "Profil", icon: <User size={18} className="text-foreground" />, href: "/profile" },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center gap-8 md:gap-12 px-6 pt-[env(safe-area-inset-top)]">
      <div className="text-center space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Witaj z powrotem
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-foreground">
          Gdzie chcesz zacząć?
        </h1>
        <p className="text-muted-foreground text-sm">
          <span className="hidden md:inline">Najedź na ikonę i kliknij, by przejść.</span>
          <span className="md:hidden">Tknij ikonę, by przejść.</span>
        </p>
      </div>

      <CircleMenu defaultOpen items={items} onSelect={(href) => navigate(href)} />
    </div>
  );
};

export default Welcome;
