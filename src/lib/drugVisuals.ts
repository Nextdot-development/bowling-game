import { BRAND } from "@/lib/brand";
import type { DrugId } from "@/types/game";

export const BALL_COLORS: Readonly<Record<DrugId, string>> = {
  amoxiclavAzithro: BRAND.red,
  amoxiclavClarithro: BRAND.navy,
  miqnaf: BRAND.gold,
};

/** Ball colour before any drug is selected. */
export const NEUTRAL_BALL_COLOR = "#7d89b8";

export function ballColor(drug: DrugId | null): string {
  return drug ? BALL_COLORS[drug] : NEUTRAL_BALL_COLOR;
}
