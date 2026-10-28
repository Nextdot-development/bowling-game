import { PINS } from "@/data/gameData";
import { richToPlain } from "@/lib/gameLogic";
import type { PinNumber } from "@/types/game";
import { RichText } from "@/components/ui/RichText";

interface PinKeyProps {
  /** Open the pin's card. */
  onOpenPin: (n: PinNumber) => void;
  /** Rows can't be tapped while the ball is rolling. */
  disabled?: boolean;
  className?: string;
}

export function PinKey({ onOpenPin, disabled = false, className = "" }: PinKeyProps) {
  return (
    <section
      aria-labelledby="pin-key-heading"
      // Over the lane on the kiosk layout: the chase camera keeps the ball clear of it.
      data-lane-cover
      className={`rounded-2xl bg-brand-navy px-4 py-4 text-white shadow-card kiosk:flex kiosk:flex-col kiosk:border-0 kiosk:bg-transparent kiosk:p-0 kiosk:shadow-none ${className}`}
    >
      <h2 id="pin-key-heading" className="eyebrow mb-3 block shrink-0 text-brand-gold kiosk:text-[clamp(1rem,1.9vh,1.2rem)]">
        The pins
      </h2>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 kiosk:min-h-0 kiosk:flex-1 kiosk:grid-cols-1 kiosk:grid-rows-[repeat(10,minmax(0,1fr))] kiosk:gap-y-[clamp(0.4rem,1vh,0.65rem)]">
        {PINS.map((p) => (
          <li key={p.number}>
            <button
              type="button"
              onClick={() => onOpenPin(p.number)}
              disabled={disabled}
              aria-label={`Card for pin ${p.number}, ${p.label}: ${richToPlain(p.name)}`}
              className="group flex min-h-11 w-full items-center gap-2.5 rounded-xl text-left leading-tight transition-colors kiosk:h-full kiosk:min-h-0 kiosk:gap-[0.85rem] px-2 enabled:hover:bg-white/10 disabled:cursor-default kiosk:bg-black/45 kiosk:px-[1rem] kiosk:py-[0.4rem] kiosk:ring-1 kiosk:ring-white/15 kiosk:backdrop-blur-sm kiosk:enabled:hover:bg-black/60 kiosk:enabled:active:bg-brand-navy/80"
            >
              <span className="pin-chip-num shrink-0 bg-white font-bold text-brand-navy kiosk:h-[clamp(1.7rem,3.2vh,2.2rem)] kiosk:min-w-[clamp(1.7rem,3.2vh,2.2rem)] kiosk:bg-white kiosk:text-[clamp(0.95rem,1.8vh,1.2rem)] kiosk:font-bold kiosk:text-brand-navy">{p.number}</span>
              <span className="min-w-0 flex-1 text-sm text-white/90 kiosk:text-[clamp(1rem,2.1vh,1.35rem)] kiosk:leading-snug kiosk:text-white/90">
                {/* The full name once: the short tag only repeated it. */}
                <span className="font-semibold text-white">
                  <RichText value={p.name} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
