import type { Config } from "tailwindcss";

/**
 * Brand colours are defined once in src/lib/brand.ts and injected as CSS
 * custom properties (see src/app/layout.tsx). Tailwind only references the
 * variables, so no hex values live here.
 */
const withAlpha = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Hover styles only on devices that can hover (no sticky hover on touch).
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      screens: {
        /**
         * Landscape screens ≥900px wide and ≥500px tall: fixed full-screen
         * layout (no page scroll). The floor is low so the 42" panel gets this
         * layout even at 175–200% Windows scaling (1080p at 200% is a 960×540
         * viewport); phones turned sideways stay below it.
         */
        kiosk: { raw: "(min-width: 900px) and (min-height: 500px) and (min-aspect-ratio: 4/3)" },
        /** Landscape screens under 500px tall (phones turned sideways): compact pop-ups. */
        short: { raw: "(max-height: 499px) and (orientation: landscape)" },
      },
      colors: {
        brand: {
          red: withAlpha("brand-red"),
          navy: withAlpha("brand-navy"),
          gold: withAlpha("brand-gold"),
        },
        ink: {
          DEFAULT: withAlpha("ink"),
          muted: withAlpha("ink-muted"),
          soft: withAlpha("ink-soft"),
        },
        surface: {
          DEFAULT: withAlpha("surface"),
          page: withAlpha("surface-page"),
          sunken: withAlpha("surface-sunken"),
          tint: withAlpha("surface-tint"),
        },
        line: withAlpha("line"),
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--brand-navy-rgb) / 0.06), 0 8px 24px -12px rgb(var(--brand-navy-rgb) / 0.18)",
        lift: "0 2px 4px rgb(var(--brand-navy-rgb) / 0.08), 0 18px 40px -18px rgb(var(--brand-navy-rgb) / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
