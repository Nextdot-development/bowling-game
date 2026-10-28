
export const BRAND = {
  red: "#9A1F24",
  navy: "#28397F",
  gold: "#E7A900",
} as const;

/** Neutral support tones (not brand accents). */
export const NEUTRALS = {
  ink: "#1B2550",
  inkMuted: "#4A5375",
  inkSoft: "#6B7391",
  surface: "#FFFFFF",
  surfacePage: "#F3F5FB",
  surfaceSunken: "#EBEFF7",
  surfaceTint: "#FDF4DC",
  line: "#DCE1EE",
} as const;

/** Colours used inside the 3D scene for the lane surroundings. */
export const SCENE = {
  backdropTop: "#152052",
  backdropLow: "#8C99C9",
  backdropBottom: "#C9D1EA",
  gutter: "#121A45",
  pinWhite: "#F7F5F0",
  pinStripe: BRAND.red,
  pinNumber: BRAND.navy,
  screenFrame: BRAND.gold,
} as const;

function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const TOKENS: Record<string, string> = {
  "brand-red": BRAND.red,
  "brand-navy": BRAND.navy,
  "brand-gold": BRAND.gold,
  ink: NEUTRALS.ink,
  "ink-muted": NEUTRALS.inkMuted,
  "ink-soft": NEUTRALS.inkSoft,
  surface: NEUTRALS.surface,
  "surface-page": NEUTRALS.surfacePage,
  "surface-sunken": NEUTRALS.surfaceSunken,
  "surface-tint": NEUTRALS.surfaceTint,
  line: NEUTRALS.line,
  "stage-top": SCENE.backdropTop,
  "stage-low": SCENE.backdropLow,
  "stage-bottom": SCENE.backdropBottom,
};

/** `:root` block exposing every token as `--name` (hex) and `--name-rgb`. */
export function brandCssVariables(): string {
  const lines = Object.entries(TOKENS).flatMap(([name, hex]) => [
    `--${name}: ${hex};`,
    `--${name}-rgb: ${hexToRgbTriplet(hex)};`,
  ]);
  return `:root{${lines.join("")}}`;
}
