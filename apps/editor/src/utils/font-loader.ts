/**
 * Dynamic Google Fonts loader.
 * Tracks loaded fonts to avoid duplicate stylesheet injections.
 */

const loadedFonts = new Set<string>();

const SYSTEM_FONTS = new Set([
  "inherit",
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "Arial",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Trebuchet MS",
  "Impact",
]);

/**
 * Ensures a font is loaded via Google Fonts.
 * Skips system fonts and already-loaded fonts.
 */
export function ensureFontLoaded(fontFamily: string | undefined): void {
  if (!fontFamily) return;

  // Strip quotes from font family name
  const cleaned = fontFamily.replace(/['"]/g, "").trim();
  if (!cleaned || SYSTEM_FONTS.has(cleaned) || loadedFonts.has(cleaned)) return;

  // Mark as loaded immediately to prevent duplicate requests
  loadedFonts.add(cleaned);

  // Inject Google Fonts stylesheet
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleaned)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}
