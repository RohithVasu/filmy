const Footer = () => {
  return (
    <footer className="relative border-t border-border/50 py-8">
      {/* Gradient divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px gradient-cinematic opacity-50" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Centered Text + Right Logo */}
        <div className="relative flex items-center justify-center">
          {/* Center text */}
          <p className="text-sm text-muted-foreground text-center">
            © 2025 <span className="font-semibold text-primary">Filmy</span> — Crafted with 🎬 + ❤️ for movie lovers.
          </p>

          {/* Right-aligned TMDB logo */}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 flex items-center"
          >
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg"
              alt="TMDB Logo"
              className="w-14 h-auto opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
