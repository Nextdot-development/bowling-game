import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

/** Tests flip this to simulate `prefers-reduced-motion: reduce`. */
export const mediaState = { reducedMotion: false };

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? mediaState.reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// jsdom has no layout; give elements a size so the 2D lane can project.
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 960 });
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 480 });

// jsdom has no WebGL: report it as unavailable without noisy errors.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];
