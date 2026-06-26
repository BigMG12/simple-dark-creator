import Hero        from "@/components/landing/Hero";
import AboutSection from "@/components/landing/AboutSection";
import DrillsGrid   from "@/components/landing/DrillsGrid";
import FinalCTA     from "@/components/landing/FinalCTA";
import Footer       from "@/components/landing/Footer";

const Index = () => (
  <div className="relative min-h-screen bg-[#0b0e1a] overflow-x-hidden">
    {/* Film-grain texture overlay — fixed, pointer-events: none */}
    <div className="texture-overlay" aria-hidden />

    <main>
      <Hero />
      <AboutSection />
      <DrillsGrid />
      <FinalCTA />
    </main>

    <Footer />
  </div>
);

export default Index;
