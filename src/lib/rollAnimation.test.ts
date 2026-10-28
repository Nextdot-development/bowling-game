import { describe, expect, it } from "vitest";
import { CONVENTIONAL_BALLS, NOVEL_BALL, PINS } from "@/data/gameData";
import { rollLane, secondThrowLane } from "@/lib/gameLogic";
import { BALL_RADIUS, BALL_START_Z, FRONT_ROW_Z, PIN_HEIGHT, PIN_MAX_RADIUS, pinPosition } from "@/lib/laneLayout";
import { AIM_BLEND_MS, AIM_REACH, aimOffset, ballLineFor, ballPose, finalPinPose, lanePinPose, pinPose, pinReactionStart, rackLineX, SETTER } from "@/lib/rollAnimation";
import { ROLL_TOTAL_MS } from "@/lib/timing";
import { BALL_TRAVEL_MS } from "@/lib/timing";
import type { LanePins, PinNumber } from "@/types/game";

const ALL_PINS = PINS.map((p) => p.number);

/** Every throw of a session on the line set by the chosen therapy: both Frame 1 throws, and MIQNAF® at a fresh rack. */
const throwsFor = (therapy: (typeof CONVENTIONAL_BALLS)[number]): LanePins[] => [rollLane(therapy), secondThrowLane(rollLane(therapy))];

describe("roll animation", () => {
  it("ball path depends only on time and the throw's line (never the drug)", () => {
    expect(ballPose(0)).toMatchObject({ x: 0, z: BALL_START_Z });
    expect(ballPose(0, ballLineFor(1234.5))).toMatchObject({ x: 0, z: BALL_START_Z }); // released on the centre-line
  });

  it("curves naturally, differently from throw to throw, but always reaches the head pin on time", () => {
    const lines = [101.2, 2002.7, 33333.3, 48211.9, 777.7, 90210.4].map((seed) => ballLineFor(seed));
    expect(new Set(lines.map((l) => Math.sign(l.bulge))).size).toBe(2); // some hook left, some right
    for (const line of lines) {
      const atPins = ballPose(BALL_TRAVEL_MS, line);
      expect(atPins.z).toBeCloseTo(FRONT_ROW_Z, 5); // same timing every throw
      expect(Math.abs(atPins.x)).toBeLessThan(0.08); // into the pocket by the head pin
      const mid = ballPose(BALL_TRAVEL_MS / 2, line);
      expect(Math.abs(mid.x)).toBeGreaterThan(0.1); // a real curve, not a straight line
      expect(Math.abs(mid.x)).toBeLessThan(0.45); // and stays well on the lane
    }
    expect(ballLineFor(555.5)).toEqual(ballLineFor(555.5)); // same throw, same line (3D and 2D agree)
  });

  it("knocks the pins over front to back, starting at the head pin", () => {
    const start = (n: PinNumber) => pinReactionStart(n);
    expect(start(1)).toBeLessThan(start(2));
    expect(start(2)).toBeLessThan(start(5));
    expect(start(5)).toBeLessThan(start(7));
    expect(start(7) - start(1)).toBeLessThan(1.9); // row by row as the ball ploughs through
    // Each pin goes as the ball reaches its row, and every pin has settled before the result shows.
    for (const n of ALL_PINS) expect(start(n) * 1000 + 1300).toBeLessThanOrEqual(ROLL_TOTAL_MS);
  });

  it("follows the swipe: left goes out left, right goes out right, straight stays near the middle", () => {
    for (const drug of CONVENTIONAL_BALLS) {
      const mid = (aim: number) => ballPose(BALL_TRAVEL_MS * 0.6, ballLineFor(777.7, drug, aim)).x;
      expect(mid(-1)).toBeLessThan(mid(0) - 0.15);
      expect(mid(1)).toBeGreaterThan(mid(0) + 0.15);
      // Wherever it was aimed, it reaches its line through the rack at the head pin.
      for (const aim of [-1, -0.4, 0, 0.4, 1]) expect(ballPose(BALL_TRAVEL_MS, ballLineFor(777.7, drug, aim)).x).toBeCloseTo(rackLineX(drug, aim), 5);
    }
  });

  it("gives every throw its own line, even with the same swipe", () => {
    for (const drug of CONVENTIONAL_BALLS) {
      const path = (seed: number) => [0.3, 0.5, 0.7, 0.85].map((f) => ballPose(BALL_TRAVEL_MS * f, ballLineFor(seed, drug, 0)).x);
      const throws = [101.2, 2002.7, 33333.3, 48211.9, 777.7, 90210.4].map(path);
      // Almost every throw takes a line of its own, and together they spread across the lane.
      expect(new Set(throws.map((t) => t.map((x) => x.toFixed(2)).join())).size).toBeGreaterThanOrEqual(5);
      const mids = throws.map((t) => t[1]!);
      expect(Math.max(...mids) - Math.min(...mids)).toBeGreaterThan(0.15);
    }
  });

  it("never rolls the ball through a pin that stays up, on any throw or swipe", () => {
    for (const drug of CONVENTIONAL_BALLS)
      for (const lane of throwsFor(drug))
        for (const aim of [-1, -0.5, 0, 0.5, 1]) {
          const line = ballLineFor(48211.9, drug, aim, lane);
          for (let ms = 0; ms <= ROLL_TOTAL_MS; ms += 10) {
            const b = ballPose(ms, line);
            if (!b.visible || b.y < 0) continue;
            for (const { number: n } of PINS) {
              if (lane[n] === "down" || lane[n] === "gone") continue;
              const p = pinPosition(n);
              expect(Math.hypot(b.x - p.x, b.z - p.z)).toBeGreaterThanOrEqual(BALL_RADIUS + PIN_MAX_RADIUS * 0.92 - 1e-9);
            }
          }
        }
  });

  it("never rolls the ball through a pin that stays up, on any throw", () => {
    for (const drug of CONVENTIONAL_BALLS) {
      for (const lane of throwsFor(drug))
      for (const seed of [101.2, 2002.7, 33333.3, 48211.9]) {
        const line = ballLineFor(seed, drug); // every throw of the session reuses this line
        expect(line.pocket).toBe(rackLineX(drug));
        for (let ms = 0; ms <= ROLL_TOTAL_MS; ms += 10) {
          const b = ballPose(ms, line);
          if (!b.visible || b.y < 0) continue;
          for (const { number: n } of PINS) {
            if (lane[n] === "down" || lane[n] === "gone") continue;
            const p = pinPosition(n);
            expect(Math.hypot(b.x - p.x, b.z - p.z)).toBeGreaterThanOrEqual(BALL_RADIUS + PIN_MAX_RADIUS * 0.92 - 1e-9);
          }
        }
      }
    }
  });

  it("never rolls the ball through a falling pin either, as it tips, skids and spins", () => {
    const clear = BALL_RADIUS + PIN_MAX_RADIUS * 0.92;
    for (const player of CONVENTIONAL_BALLS) {
      for (const lane of throwsFor(player)) {
        const line = ballLineFor(2002.7, player, null, lane);
        const pathX = line.pocket; // each throw's own line (the pins fall away from it)
        for (let ms = BALL_TRAVEL_MS - 200; ms <= ROLL_TOTAL_MS; ms += 10) {
          const b = ballPose(ms, line);
          if (!b.visible || b.y < 0) continue;
          for (const { number: n } of PINS) {
            const pose = lanePinPose(n, lane[n], "rolling", ms, { pathX, strike: false, sweeping: false, resetSinceMs: null });
            if (pose.opacity < 0.05) continue;
            const p = pinPosition(n);
            // The pin's axis from its base, tipped and then turned about the vertical.
            const tx = -pose.axisZ;
            const tz = pose.axisX;
            const dx = tx * Math.cos(pose.yaw) + tz * Math.sin(pose.yaw);
            const dz = -tx * Math.sin(pose.yaw) + tz * Math.cos(pose.yaw);
            for (let h = 0; h <= 1; h += 0.1) {
              const along = Math.sin(pose.angle) * PIN_HEIGHT * h;
              if (pose.lift + Math.cos(pose.angle) * PIN_HEIGHT * h > 2 * BALL_RADIUS) continue; // above the ball
              const gap = Math.hypot(b.x - (p.x + pose.dx + dx * along), b.z - (p.z + pose.dz + dz * along));
              expect(gap).toBeGreaterThanOrEqual(clear);
            }
          }
        }
      }
    }
  });

  it("standing pins end upright and dimmed; fallen pins lie on the deck, or out of sight in the pit", () => {
    for (const n of ALL_PINS) {
      const up = finalPinPose(n, false);
      expect(up.angle).toBe(0);
      expect(up.opacity).toBe(1);
      expect(up.dim).toBe(1);
      const down = finalPinPose(n, true);
      if (down.opacity > 0) {
        expect(down.angle).toBeGreaterThan(1.4); // lying down, not upright
        expect(down.lift).toBeGreaterThanOrEqual(0); // on the deck
      } else {
        expect(down.lift).toBeLessThan(0); // dropped into the pit
      }
      // It stays where it came to rest: no fading away over time.
      const later = pinPose(n, true, BALL_TRAVEL_MS + 7000);
      for (const [k, v] of Object.entries(pinPose(n, true, BALL_TRAVEL_MS + 4000))) expect(v).toBeCloseTo(later[k as keyof typeof later], 6);
    }
  });

  it("pins are untouched before the ball arrives", () => {
    expect(pinPose(1, true, 1000)).toMatchObject({ angle: 0, opacity: 1 });
  });

  it("swipe offset is bounded and gone shortly after release", () => {
    expect(aimOffset("ready", 0, 5)).toBe(AIM_REACH);
    expect(aimOffset("rolling", 0, 1)).toBe(AIM_REACH);
    expect(aimOffset("rolling", AIM_BLEND_MS, 1)).toBe(0);
    expect(aimOffset("rolling", 2000, 1)).toBe(0);
    expect(aimOffset("result", 0, 1)).toBe(0);
  });

  it("the strike ball goes into the pocket and never passes through a pin", () => {
    const pathX = rackLineX(NOVEL_BALL);
    expect(pathX).toBeGreaterThan(0.05); // the pocket, not straight through the head pin
    expect(pathX).toBeLessThan(0.2);
    const lane = rollLane(NOVEL_BALL);
    const line = ballLineFor(2002.7, NOVEL_BALL);
    const clear = BALL_RADIUS + PIN_MAX_RADIUS * 0.92;
    for (let ms = BALL_TRAVEL_MS - 200; ms <= ROLL_TOTAL_MS; ms += 10) {
      const b = ballPose(ms, line);
      if (!b.visible || b.y < 0) continue;
      for (const { number: n } of PINS) {
        const pose = lanePinPose(n, lane[n], "rolling", ms, { pathX, strike: true, sweeping: false, resetSinceMs: null });
        if (pose.opacity < 0.05 || pose.lift > 2 * BALL_RADIUS) continue;
        const p = pinPosition(n);
        expect(Math.hypot(b.x - (p.x + pose.dx), b.z - (p.z + pose.dz))).toBeGreaterThanOrEqual(clear * 0.95); // touching (the hit) is fine; passing through is not
      }
    }
  });

  it("on the second throw the rack stays exactly as the first throw left it: only the shaking pin wobbles", () => {
    for (const drug of CONVENTIONAL_BALLS) {
      const first = rollLane(drug);
      const lane = secondThrowLane(first);
      const line = ballLineFor(48211.9, drug, 0.3, lane);
      const ctx = { pathX: line.pocket, strike: false, sweeping: false, resetSinceMs: null };
      for (const n of ALL_PINS) {
        const atStart = lanePinPose(n, lane[n], "rolling", 0, ctx);
        const end = lanePinPose(n, lane[n], "rolling", ROLL_TOTAL_MS, ctx);
        if (lane[n] === "gone") {
          // Cleared away: only the standing pins are on the lane.
          expect(atStart.opacity).toBe(0);
          expect(end.opacity).toBe(0);
        } else if (first[n] === "wobble") {
          // The pin the first throw left shaking wobbles again, and stays up.
          expect(lane[n]).toBe("wobble");
          expect(end).toMatchObject({ opacity: 1, dx: 0, dz: 0 });
          const moved = Array.from({ length: 50 }, (_, i) => Math.abs(lanePinPose(n, lane[n], "rolling", BALL_TRAVEL_MS + i * 40, ctx).angle));
          expect(Math.max(...moved)).toBeGreaterThan(0.1);
        } else {
          // Every other standing pin stays perfectly still.
          expect(atStart).toMatchObject({ lift: 0, dx: 0, dz: 0 });
          expect(end).toMatchObject({ opacity: 1, dx: 0, dz: 0, angle: 0 });
        }
      }
    }
  });

  it("between frames the deck is swept, then a fresh rack of ten is lowered into place", () => {
    const lane = secondThrowLane(rollLane("amoxiclavClarithro"));
    const ctx = (since: number | null) => ({ pathX: 0, strike: false, sweeping: false, resetSinceMs: since });
    for (const n of ALL_PINS) {
      expect(lanePinPose(n, lane[n], "transition", 0, ctx((SETTER.swept + 0.02) * 1000)).opacity).toBe(0); // swept
      expect(lanePinPose(n, lane[n], "transition", 0, ctx((SETTER.rackSet + 0.05) * 1000))).toMatchObject({ opacity: 1, lift: 0, angle: 0 });
    }
  });

  it("a strike goes off almost all at once", () => {
    const start = (n: PinNumber) => pinReactionStart(n, rackLineX(NOVEL_BALL), true);
    expect(Math.max(...ALL_PINS.map(start)) - Math.min(...ALL_PINS.map(start))).toBeLessThan(0.25);
  });
});
