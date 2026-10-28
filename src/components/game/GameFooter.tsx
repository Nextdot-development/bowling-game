import { DISCLAIMER } from "@/data/gameData";

export function GameFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/40 px-4 py-3 sm:px-8 lg:px-12 kiosk:py-[min(0.75rem,1.2vh)]" data-testid="disclaimer">
      <p className="text-sm leading-snug text-white/70 sm:text-[0.95rem]">{DISCLAIMER}</p>
    </footer>
  );
}
