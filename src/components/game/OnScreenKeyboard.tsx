"use client";

import { ArrowBigUp, Delete } from "lucide-react";
import type { PointerEvent } from "react";

interface OnScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Capitals for the next letter (on at the start of each word). */
  shift: boolean;
  onShiftChange: (shift: boolean) => void;
}

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", ".", "-", "'"],
] as const;
/** On phones these leave the third row (so its letters get room) and sit beside Space. */
const PUNCTUATION = [".", "-", "'"] as const;
const isPunctuation = (k: string) => (PUNCTUATION as readonly string[]).includes(k);

/** Keeps focus (and the caret) in the name field while a key is tapped. */
const keepFocus = (e: PointerEvent) => e.preventDefault();

const KEY_BASE =
  "flex h-11 min-w-0 flex-1 select-none items-center justify-center rounded-lg font-display text-lg font-bold shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] transition-transform active:translate-y-0.5 active:shadow-none sm:h-16 sm:rounded-xl sm:text-2xl kiosk:h-auto kiosk:text-[clamp(1.6rem,3.4vh,2.4rem)]";
/** Letter keys: white on the navy tray. */
const KEY = `${KEY_BASE} bg-surface text-brand-navy active:bg-brand-gold`;
/** Shift, Delete, Clear: a quieter tone, so the letters stand out. */
const FN_KEY = `${KEY_BASE} bg-white/15 text-white active:bg-white/25`;

export function OnScreenKeyboard({ value, onChange, maxLength, shift, onShiftChange }: OnScreenKeyboardProps) {
  const type = (ch: string) => {
    if (value.length >= maxLength) return;
    const next = value + (shift ? ch.toUpperCase() : ch.toLowerCase());
    onChange(next);
    onShiftChange(false);
  };
  const space = () => {
    if (value.length >= maxLength || value === "" || value.endsWith(" ")) return;
    onChange(value + " ");
    onShiftChange(true);
  };
  const backspace = () => {
    const next = value.slice(0, -1);
    onChange(next);
    onShiftChange(next === "" || next.endsWith(" "));
  };
  const clear = () => {
    onChange("");
    onShiftChange(true);
  };

  return (
    <div role="group" aria-label="On-screen keyboard" data-sound="key" className="mx-auto w-full space-y-2 kiosk:flex kiosk:h-full kiosk:flex-col kiosk:gap-[0.75rem] kiosk:space-y-0">
      {ROWS.map((row, i) => (
        <div key={i} className={`flex gap-1 sm:gap-2 kiosk:min-h-[3.4rem] kiosk:flex-1 kiosk:gap-[0.75rem] ${i === 1 ? "px-[4%]" : ""}`}>
          {i === 2 && (
            <button
              type="button"
              onPointerDown={keepFocus}
              onClick={() => onShiftChange(!shift)}
              aria-label="Shift"
              aria-pressed={shift}
              className={`${shift ? `${KEY_BASE} bg-brand-gold text-brand-navy` : FN_KEY} flex-[1.4]`}
            >
              <ArrowBigUp className="h-7 w-7 kiosk:h-[2.2rem] kiosk:w-[2.2rem]" strokeWidth={2.5} aria-hidden />
            </button>
          )}
          {row.map((k) => {
            const ch = /[A-Z]/.test(k) ? (shift ? k : k.toLowerCase()) : k;
            return (
              <button key={k} type="button" onPointerDown={keepFocus} onClick={() => type(k)} aria-label={ch} className={`${KEY} ${isPunctuation(k) ? "hidden sm:flex" : ""}`}>
                {ch}
              </button>
            );
          })}
          {i === 2 && (
            <button type="button" onPointerDown={keepFocus} onClick={backspace} aria-label="Delete" className={`${FN_KEY} flex-[1.4]`}>
              <Delete className="h-7 w-7 kiosk:h-[2.2rem] kiosk:w-[2.2rem]" strokeWidth={2.5} aria-hidden />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-1 sm:gap-2 kiosk:min-h-[3.4rem] kiosk:flex-1 kiosk:gap-[0.75rem]">
        <button type="button" onPointerDown={keepFocus} onClick={clear} className={`${FN_KEY} flex-[1.5] text-sm sm:text-lg kiosk:text-[1.2rem]`}>
          Clear
        </button>
        {PUNCTUATION.map((k) => (
          <button key={k} type="button" onPointerDown={keepFocus} onClick={() => type(k)} aria-label={k} className={`${KEY} sm:hidden`} tabIndex={-1}>
            {k}
          </button>
        ))}
        <button type="button" onPointerDown={keepFocus} onClick={space} aria-label="Space" className={`${KEY} flex-[6] text-base sm:text-lg kiosk:text-[1.2rem]`}>
          Space
        </button>
      </div>
    </div>
  );
}
