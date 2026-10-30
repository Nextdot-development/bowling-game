import { describe, expect, it } from "vitest";
import { playersToCsv, savePlayer } from "@/lib/playerLog";

const at = (y: number, mo: number, d: number, h: number, mi: number, s: number) => new Date(y, mo - 1, d, h, mi, s).getTime();

describe("player list CSV", () => {
  it("has a header, then one row per player: name, local date and time", () => {
    const csv = playersToCsv([
      { name: "Asha Rao", at: at(2026, 10, 30, 9, 5, 7) },
      { name: "Vikram", at: at(2026, 10, 30, 14, 30, 0) },
    ]);
    expect(csv.startsWith("﻿")).toBe(true); // Excel reads it as UTF-8
    expect(csv.slice(1).split("\r\n")).toEqual(["Name,Date,Time", "Asha Rao,2026-10-30,09:05:07", "Vikram,2026-10-30,14:30:00", ""]);
  });

  it("keeps a name with a comma, quote or line break in one cell", () => {
    const rows = playersToCsv([{ name: 'Rao, A. "Ash"', at: at(2026, 1, 2, 3, 4, 5) }]).slice(1).split("\r\n");
    expect(rows[1]).toBe('"Rao, A. ""Ash""",2026-01-02,03:04:05');
  });

  it("never lets a name run as a spreadsheet formula", () => {
    const rows = playersToCsv([{ name: "=HYPERLINK(1)", at: 0 }, { name: "+1", at: 0 }]).slice(1).split("\r\n");
    expect(rows[1]!.startsWith("'=HYPERLINK(1)")).toBe(true);
    expect(rows[2]!.startsWith("'+1")).toBe(true);
  });

  it("an empty list is just the header", () => {
    expect(playersToCsv([])).toBe("﻿Name,Date,Time\r\n");
  });

  it("saving never throws where storage is unavailable: the game carries on", async () => {
    await expect(savePlayer("Asha")).resolves.toBe(false); // no IndexedDB in the test environment
  });
});
