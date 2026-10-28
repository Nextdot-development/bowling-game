import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // No floating Next.js badge in development (it overlapped the kiosk UI).
    devIndicators: false,
    // `next dev` and `next build` get separate output folders, so running a
    // build while the dev server is up can't delete chunks the dev server
    // still needs ("Cannot find module './NNN.js'").
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
