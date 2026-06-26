import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Wordmark = () => (
  <a href="#top" className="group flex items-center gap-2">
    <span className="font-display text-xl font-bold tracking-tighter text-foreground transition-all group-hover:text-primary group-hover:[text-shadow:_0_0_24px_hsl(var(--primary)/0.6)]">
      BIG SPEAKING
    </span>
  </a>
);

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? "border-b border-border bg-background/70 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <Wordmark />

        <nav className="hidden items-center gap-2 md:flex">
          <Button variant="ghost-dark" asChild>
            <Link to="/auth">Zaloguj się</Link>
          </Button>
          <Button variant="fire" asChild>
            <Link to="/auth?mode=signup">Rozpocznij trening</Link>
          </Button>
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost-dark" size="icon" aria-label="Otwórz menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-border bg-surface">
              <div className="mt-10 flex flex-col gap-3">
                <Button variant="ghost-dark" asChild>
                  <Link to="/auth">Zaloguj się</Link>
                </Button>
                <Button variant="fire" asChild>
                  <Link to="/auth?mode=signup">Rozpocznij trening</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
