// Ersetzt das Tailwind-Play-CDN (Laufzeit-Compiler aus dem Netz) durch eine vorkompilierte Datei.
// Neu erzeugen: npm run build:css  (nach Aenderungen an Klassen in app/*.html)
module.exports = {
  content: ['./app/**/*.html'],
  theme: { extend: {} },
  plugins: [],
};
