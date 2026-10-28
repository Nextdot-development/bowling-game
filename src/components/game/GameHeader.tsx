"use client";

import { RotateCcw } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { SoundToggle } from "./SoundToggle";

interface GameHeaderProps {
  title: string;
  /** The instruction for this moment of the game (under the title). */
  subtitle?: string;
  /** Which frame: shown as a badge above the title. */
  frame: 1 | 2 | null;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  onNewSession: () => void;
}

export function GameHeader({
  title,
  subtitle,
  frame,
  soundOn,
  onSoundChange,
  onNewSession,
}: GameHeaderProps) {
  return (
    <header className="game-header relative">
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:px-8 short:py-1.5 lg:px-12 lg:py-3 kiosk:py-[min(0.9rem,1.4vh)]">
        {/* The logo on a white plate, so its red and black artwork reads on the dark bar. */}
        <span className="inline-flex justify-self-start rounded-xl bg-white px-3 py-1.5 shadow-lift short:px-2 short:py-1 kiosk:rounded-2xl kiosk:px-[1rem] kiosk:py-[0.45rem]">
          <BrandLogo priority className="h-7 sm:h-9 short:h-6 kiosk:h-[2.9rem]" />
        </span>
        <div className="order-last col-span-2 min-w-0 text-center sm:order-none sm:col-span-1">
          {frame && (
            <p
              className={`mx-auto mb-1 inline-block rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-[0.14em] sm:text-sm kiosk:text-base ${
                frame === 2 ? "bg-brand-gold text-brand-navy" : "bg-brand-navy text-white"
              }`}
            >
              Frame {frame} of 2
            </p>
          )}
          <h1
            className="game-header-title truncate font-display text-xl uppercase tracking-wide text-brand-gold sm:text-2xl short:text-lg lg:text-3xl xl:text-[2.4rem]"
            aria-live="polite"
          >
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base kiosk:text-[clamp(1rem,1.9vh,1.3rem)]">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <SoundToggle on={soundOn} onChange={onSoundChange} />
          <button
            type="button"
            onClick={onNewSession}
            className="btn-primary min-h-[44px] min-w-[44px] gap-2 rounded-full px-4 py-2 text-base tracking-wide"
            aria-label="New game"
          >
            <RotateCcw className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            <span className="hidden lg:inline">New game</span>
          </button>
        </div>
      </div>
      <div className="tricolour-rule h-1" aria-hidden />
    </header>
  );
}
