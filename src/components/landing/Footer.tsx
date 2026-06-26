const Footer = () => (
  <footer className="bg-[#0b0e1a] border-t border-white/[0.06] py-8">
    <div className="container text-center">
      <div className="font-anton text-[20px] uppercase tracking-[0.1em] text-foreground mb-2.5">
        BIG.<span className="text-primary">SPEAKING</span>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/30">
        © {new Date().getFullYear()} BIG Speaking · Trening krasomówczy napędzany AI
      </p>
    </div>
  </footer>
);

export default Footer;
