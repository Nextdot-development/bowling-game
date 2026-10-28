"use client";

import { Volume2, VolumeX } from "lucide-react";

interface SoundToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

/** Single switch for roll and pin sounds. Off by default. */
export function SoundToggle({ on, onChange }: SoundToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-[44px] items-center gap-3 rounded-full bg-white/10 py-1.5 pl-3 pr-1.5 font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
    >
      {on ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5 text-white/50" aria-hidden />}
      <span className="hidden lg:inline">Sound {on ? "on" : "off"}</span>
      <span className="sr-only lg:hidden">Sound</span>
      <span
        aria-hidden
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          on ? "bg-brand-gold" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute h-5 w-5 rounded-full bg-surface shadow transition-transform ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
