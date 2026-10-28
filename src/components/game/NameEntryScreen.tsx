"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cleanDoctorName, MAX_NAME_LENGTH } from "@/lib/gameLogic";
import { OnScreenKeyboard } from "./OnScreenKeyboard";

interface NameEntryScreenProps {
  onSubmit: (name: string) => void;
}

export function NameEntryScreen({ onSubmit }: NameEntryScreenProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shift, setShift] = useState(true);
  const [touch, setTouch] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    setTouch(!!window.matchMedia?.("(pointer: coarse)").matches);
    input.current?.focus();
  }, []);

  const change = (next: string) => {
    setValue(next);
    if (error) setError(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cleanDoctorName(value)) {
      setError(true);
      input.current?.focus();
      return;
    }
    onSubmit(value);
  };

  return (
    <motion.section
      aria-labelledby="name-heading"
      className="flex flex-1 items-center justify-center py-6 kiosk:min-h-0 kiosk:items-stretch kiosk:py-0"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35 }}
    >
      <form
        noValidate
        onSubmit={submit}
        className="game-panel w-full max-w-3xl text-center kiosk:flex kiosk:max-w-none kiosk:flex-col"
      >
        {/* Title band, as on the game's pop-ups. */}
        <div className="game-panel-head kiosk:!py-[clamp(0.8rem,2vh,1.3rem)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70 kiosk:text-base">Welcome, Doctor</p>
          <h2 id="name-heading" className="game-stamp game-panel-title mt-1 kiosk:!text-[clamp(2.4rem,5vh,3.4rem)]">
            Let&apos;s Get Started
          </h2>
        </div>
        {/* On the kiosk the card fills the screen and the keyboard takes the spare height. */}
        <div className="px-4 py-6 sm:px-10 sm:py-8 kiosk:mx-auto kiosk:flex kiosk:min-h-0 kiosk:w-full kiosk:max-w-[90rem] kiosk:flex-1 kiosk:flex-col kiosk:px-[3rem] kiosk:py-[clamp(1.25rem,3vh,2.25rem)]">
        <p className="text-base text-white/75 sm:text-lg kiosk:text-[1.25rem]">
          Your name is used only for the greeting in this game.
        </p>

        <label htmlFor="doctor-name" className="sr-only">
          Your name
        </label>
        {/* The name field, with the "Dr." it will be greeted with. */}
        <div
          className={`mt-5 flex items-center gap-3 rounded-2xl border-2 bg-white px-4 transition-colors focus-within:border-brand-gold focus-within:shadow-[0_0_0_4px_rgb(var(--brand-gold-rgb)/0.35)] kiosk:mt-[clamp(1rem,2.6vh,1.75rem)] kiosk:px-[1.25rem] ${
            error ? "border-brand-red" : "border-white/30"
          }`}
        >
          <span className="shrink-0 rounded-xl bg-brand-navy px-3 py-1.5 font-display text-lg font-black text-white kiosk:text-[1.4rem]" aria-hidden>
            Dr.
          </span>
        <input
          ref={input}
          id="doctor-name"
          type="text"
          name="name"
          value={value}
          onChange={(e) => {
            change(e.target.value);
            setShift(e.target.value === "" || e.target.value.endsWith(" "));
          }}
          inputMode={touch ? "none" : "text"}
          placeholder="Enter your name"
          maxLength={MAX_NAME_LENGTH + 4}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          required
          aria-invalid={error}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 select-text bg-transparent py-4 text-left text-xl font-semibold text-brand-navy caret-brand-red outline-none placeholder:font-normal placeholder:text-ink-soft sm:text-2xl kiosk:py-[clamp(0.7rem,1.6vh,1.1rem)] kiosk:text-[1.8rem]"
        />
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-2 text-base font-semibold text-brand-gold kiosk:text-[1.1rem]">
            Please enter your name to continue.
          </p>
        )}

        <div className="mt-5 rounded-3xl bg-black/30 p-3 ring-1 ring-white/10 sm:p-4 kiosk:mt-[clamp(1rem,2.4vh,1.5rem)] kiosk:min-h-0 kiosk:flex-1 kiosk:p-[1.25rem]">
          <OnScreenKeyboard value={value} onChange={change} maxLength={MAX_NAME_LENGTH} shift={shift} onShiftChange={setShift} />
        </div>

        <button
          type="submit"
          className="btn-primary mt-5 px-10 py-3.5 text-xl tracking-[0.06em] sm:text-2xl kiosk:mt-[clamp(1rem,2.4vh,1.6rem)] kiosk:px-[3rem] kiosk:py-[clamp(0.8rem,1.8vh,1.1rem)] kiosk:text-[1.7rem]"
        >
          Continue <ArrowRight className="h-7 w-7" strokeWidth={3} aria-hidden />
        </button>
        </div>
      </form>
    </motion.section>
  );
}
