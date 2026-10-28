"use client";

import { useEffect, useRef } from "react";
import { BRAND } from "@/lib/brand";

// Brand gold, navy and white only: no red in the pop-ups.
const COLORS = [BRAND.gold, BRAND.gold, BRAND.navy, "#ffffff"];
/** How long the confetti stays up, from the first pop. */
const DURATION_MS = 8000;

/**
 * The confetti pops once: two cannons from the bottom corners and a shower
 * over the whole screen. `at` is ms after it starts; the win sound pops at
 * the same moment (CONFETTI_POPS_S in endSound.ts).
 */
const BURSTS = [
  // One pop: the cannons fire once and a single shower falls over the screen.
  { at: 0, from: "corners", count: 120 },
  { at: 0, from: "top", count: 220 },
] as const;

interface Piece {
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  spin: number;
  angle: number;
  wobble: number;
  color: string;
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const scale = Math.max(1, W / 1200);
    const piece = (delay: number, x: number, y: number, angleDeg: number, speed: number): Piece => {
      const a = angleDeg * (Math.PI / 180);
      return {
        delay,
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 1.3,
        w: (7 + Math.random() * 7) * scale,
        h: (10 + Math.random() * 10) * scale,
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
        wobble: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      };
    };
    const pieces: Piece[] = BURSTS.flatMap(({ at, from, count }) =>
      Array.from({ length: count }, (_, i) => {
        if (from === "top") {
          // A shower over the whole screen, falling from just above the top edge.
          const p = piece(at + Math.random() * 900, Math.random() * W, -20 - Math.random() * H * 0.4, 90, 0);
          p.vx = (Math.random() - 0.5) * 2 * scale;
          p.vy = (1 + Math.random() * 2) * scale;
          return p;
        }
        const left = i % 2 === 0;
        // Cannons aimed up and in towards the middle of the screen.
        const angle = (left ? -58 : -122) + (Math.random() - 0.5) * 50;
        return piece(at, left ? 0 : W, H * 0.85, angle, (10 + Math.random() * 14) * scale);
      }),
    );

    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.7);
      last = now;
      const t = now - t0;
      const fade = Math.min(1, Math.max(0, (DURATION_MS - t) / 1200));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        if (t < p.delay) continue;
        p.vy += 0.3 * scale * dt;
        p.vx *= 0.985;
        p.vy = Math.min(p.vy, 4 * scale); // flutters down slowly
        p.wobble += 0.12 * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 1.2) * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        if (p.y > H + 40) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(1, Math.cos(p.wobble)); // flutter
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < DURATION_MS) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden />;
}
