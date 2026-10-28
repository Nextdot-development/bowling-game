import { PINS } from "@/data/gameData";
import { pinsDownCount, standingPins } from "@/lib/gameLogic";
import type { DrugId, PinNumber } from "@/types/game";

/** The ten supplied barriers, in rack order. */
export const EXPECTED_NAMES: Readonly<Record<PinNumber, string>> = {
  1: "Susceptibility Vs CABP Pathogens",
  2: "Bactericidal Activity",
  3: "Patient Compliance (Dose Frequency)",
  4: "High Lung Concentration",
  5: "QT Prolongation",
  6: "Atypical Coverage",
  7: "Anti-Inflammatory / Immunomodulatory Activity",
  8: "Managing AMR",
  9: "Low Drug-Drug Interaction",
  10: "Post Antibiotic Effect",
};

/** First-throw results as supplied (the shaking pin counts as standing). */
export const EXPECTED_RESULTS: Readonly<Record<DrugId, { down: number; standing: PinNumber[] }>> = {
  amoxiclavAzithro: { down: 4, standing: [1, 3, 4, 5, 8, 10] },
  amoxiclavClarithro: { down: 5, standing: [3, 5, 6, 8, 10] },
  miqnaf: { down: 10, standing: [] },
};

export function validateOutcomeMatrix(): string[] {
  const errors: string[] = [];
  if (PINS.length !== 10) errors.push(`Expected 10 pins, found ${PINS.length}`);

  const numbers = PINS.map((p) => p.number);
  if (new Set(numbers).size !== numbers.length) errors.push("Pin numbers are not unique");

  for (const pin of PINS) {
    const name = pin.name.map((s) => (typeof s === "string" ? s : s.em)).join("");
    if (EXPECTED_NAMES[pin.number] !== name) errors.push(`Pin ${pin.number} "${name}" should be "${EXPECTED_NAMES[pin.number]}"`);
  }

  for (const [drug, expected] of Object.entries(EXPECTED_RESULTS) as [DrugId, (typeof EXPECTED_RESULTS)[DrugId]][]) {
    const down = pinsDownCount(drug);
    if (down !== expected.down) errors.push(`${drug}: expected ${expected.down} down, found ${down}`);
    const standing = standingPins(drug);
    if (standing.join(",") !== expected.standing.join(",")) {
      errors.push(`${drug}: expected standing [${expected.standing}], found [${standing}]`);
    }
  }
  return errors;
}
