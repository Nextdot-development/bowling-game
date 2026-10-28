import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pinsDownCount, TOTAL_PINS } from "@/lib/gameLogic";
import { FRONT_ROW_Z } from "@/lib/laneLayout";
import { ballArrivalSeconds } from "@/lib/rollAnimation";
import { BGM_FILE, buildSoundCues, END_SOUND_FILES, IMPACT_SECONDS, SOUND_FILES } from "@/lib/rollSound";
import type { DrugId } from "@/types/game";

describe("roll sound plan", () => {
  it("uses the supplied recordings, which exist in public/", () => {
    for (const file of [...Object.values(SOUND_FILES), ...Object.values(END_SOUND_FILES), BGM_FILE]) {
      expect(fs.existsSync(path.join(process.cwd(), "public", file))).toBe(true);
    }
  });

  it("lands the strike exactly when the ball reaches the front row", () => {
    expect(IMPACT_SECONDS).toBeCloseTo(ballArrivalSeconds(FRONT_ROW_Z), 9);
    const strike = buildSoundCues(8, 8).find((c) => c.sound === "strike");
    expect(strike?.at).toBeCloseTo(IMPACT_SECONDS, 9);
  });

  it("keeps the rolling sound going while the ball rolls, through the pins to the pit", () => {
    for (const down of [4, 10]) {
      const roll = buildSoundCues(down, 10).find((c) => c.sound === "roll")!;
      expect(roll.at).toBe(0);
      expect(roll.fadeFrom!).toBeGreaterThan(IMPACT_SECONDS + 1);
      expect(roll.loop).toBeDefined(); // only the clean rolling part
    }
  });

  it("uses the same timing for every drug; only the crash loudness follows pins down", () => {
    const cues = (drug: DrugId) => buildSoundCues(pinsDownCount(drug), TOTAL_PINS);
    const times = (drug: DrugId) => cues(drug).map((c) => [c.sound, c.at]);
    expect(times("amoxiclavAzithro")).toEqual(times("miqnaf"));
    const gain = (drug: DrugId) => cues(drug).find((c) => c.sound === "strike")!.gain;
    expect(gain("miqnaf")).toBeGreaterThan(gain("amoxiclavAzithro"));
    expect(gain("miqnaf")).toBeLessThanOrEqual(1);
  });

  it("brings the quiet rolling up after the set-down thud, on every throw", () => {
    for (const down of [0, 4, 10]) {
      const roll = buildSoundCues(down, 10).find((c) => c.sound === "roll")!;
      expect(roll.boost!.gain).toBeGreaterThan(roll.gain * 3);
      expect(roll.boost!.from).toBeGreaterThan(0.2); // after the thud
      expect(roll.boost!.to).toBeLessThan(IMPACT_SECONDS); // well before the pins
    }
  });

  it("plays no strike when no pin falls (the second throw)", () => {
    expect(buildSoundCues(0, 10).map((c) => c.sound)).toEqual(["roll"]);
    // The rolling sound carries on through the rack until the ball drops into the pit.
    expect(buildSoundCues(0, 10)[0]!.fadeFrom!).toBeGreaterThan(IMPACT_SECONDS + 1);
    expect(buildSoundCues(0, 10)[0]!.loop).toEqual([1.0, 1.6]); // only the clean, steady rolling part
    expect(buildSoundCues(0, 10, true)).toEqual([]);
  });

  it("plays just the strike straight away for reduced-motion rolls", () => {
    expect(buildSoundCues(5, 8, true)).toEqual([expect.objectContaining({ sound: "strike" })]);
  });
});
