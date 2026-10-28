import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DRUGS } from "@/data/gameData";
import { chaseShot, FULL_FRAME, type FrameBounds } from "@/lib/cameraRig";
import { rollLane, secondThrowLane } from "@/lib/gameLogic";
import { BALL_RADIUS, BALL_START_Z, CAMERA, DECK_END_Z, PIN_HEIGHT, pinPosition, verticalFovFor } from "@/lib/laneLayout";
import { AIM_REACH, ballLineFor, ballPose, STRAIGHT_LINE, type BallLine } from "@/lib/rollAnimation";
import type { DrugId } from "@/types/game";

/** Lane-stage shapes (width / height): portrait phone and portrait 42" panel, tablets, laptops, the 16:9 panel at every scaling, ultrawide. */
const ASPECTS = [0.5, 0.62, 0.75, 1, 1.33, 1.6, 1.78, 2.2, 2.6, 3.2];
const AIMS = [null, -1, -0.4, 0.4, 1];
const SEEDS = [0.11, 0.58, 0.97];

/**
 * The bottom of the frame the lane card ("Rolling …") can cover while the ball
 * rolls, in normalised screen space: the ball stays above it.
 */
const CARD_ZONE = -0.85;

/**
 * The ball's silhouette in normalised screen space: `x` is how near a side it
 * comes, `y` how near the top, `bottom` how low its lowest point is (-1 = the foot of the frame).
 */
function ballOnScreen(camera: THREE.PerspectiveCamera, x: number, y: number, z: number): { x: number; y: number; bottom: number; left: number; right: number } {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  let mx = 0;
  let top = -1;
  let bottom = 1;
  let lo = 1;
  let hi = -1;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const p = new THREE.Vector3(x, y, z).addScaledVector(right, dx * BALL_RADIUS).addScaledVector(up, dy * BALL_RADIUS).project(camera);
    mx = Math.max(mx, Math.abs(p.x));
    top = Math.max(top, p.y);
    bottom = Math.min(bottom, p.y);
    lo = Math.min(lo, p.x);
    hi = Math.max(hi, p.x);
  }
  return { x: mx, y: top, bottom, left: lo, right: hi };
}

/** Visible strips: the full frame, the 42" kiosk layout (the pin list covers the right of the lane), and a cover on the left. */
const STRIPS: FrameBounds[] = [FULL_FRAME, { left: -1, right: 0.55 }, { left: -0.55, right: 1 }];

function cameraFor(aspect: number, pos: readonly number[], look: readonly number[]) {
  const camera = new THREE.PerspectiveCamera(verticalFovFor(aspect), aspect, 0.05, 40);
  camera.position.set(pos[0]!, pos[1]!, pos[2]!);
  camera.lookAt(look[0]!, look[1]!, look[2]!);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

/** The worst the ball comes to each frame edge over a whole roll, while it is on the lane. */
function worstOverRoll(line: BallLine, aspect: number, strip: FrameBounds): { x: number; y: number; bottom: number; left: number; right: number; pinTop: number } {
  const worst = { x: 0, y: -1, bottom: 1, left: 1, right: -1, pinTop: -1 };
  for (let ms = 0; ms < 8000; ms += 20) {
    const b = ballPose(ms, line);
    if (!b.visible || b.z < DECK_END_Z) break; // in the pit: out of sight by design
    const shot = chaseShot(ms, line, verticalFovFor(aspect), aspect, strip);
    const camera = cameraFor(aspect, shot.pos, shot.look);
    const s = ballOnScreen(camera, b.x, b.y, b.z);
    // The tops of the pins (all ten, standing): the close-up must not cut them off.
    if (ms >= 450)
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
        const p = pinPosition(n);
        const top = new THREE.Vector3(p.x, PIN_HEIGHT, p.z).project(camera);
        if (top.z < 1) worst.pinTop = Math.max(worst.pinTop, top.y);
      }
    worst.x = Math.max(worst.x, s.x);
    worst.y = Math.max(worst.y, s.y);
    // Before the camera has dropped in behind the ball it is still at its rest framing, with the ball near the centre.
    if (ms >= 450) {
      worst.left = Math.min(worst.left, s.left);
      worst.right = Math.max(worst.right, s.right);
    }
    // Off the deck the camera is still easing in from its rest framing, where the ball rests low by design (checked below).
    if (ms >= 450) worst.bottom = Math.min(worst.bottom, s.bottom);
  }
  return worst;
}

describe("the ball stays in frame", () => {
  it("while rolling, on every screen shape, therapy, throw and swipe", () => {
    const failures: string[] = [];
    for (const aspect of ASPECTS)
      for (const drug of Object.keys(DRUGS) as DrugId[])
        for (const lane of [rollLane(drug), secondThrowLane(rollLane(drug), drug)])
          for (const aim of AIMS)
            for (const seed of SEEDS)
              for (const strip of STRIPS) {
                const w = worstOverRoll(ballLineFor(seed, drug, aim, lane), aspect, strip);
                const hidden = w.left < strip.left + 0.02 || w.right > strip.right - 0.02;
                if (w.x > 0.95 || w.y > 0.95 || w.bottom < CARD_ZONE || hidden || w.pinTop > 0.9)
                  failures.push(
                    `aspect ${aspect} strip ${strip.left}..${strip.right} ${drug} aim ${aim} seed ${seed}: ` +
                      `x ${w.left.toFixed(2)}..${w.right.toFixed(2)} top ${w.y.toFixed(2)} bottom ${w.bottom.toFixed(2)} pin tops ${w.pinTop.toFixed(2)}`,
                  );
              }
    expect(failures).toEqual([]);
  }, 60000);

  it("resting and being aimed before the throw, on every screen shape", () => {
    for (const aspect of ASPECTS) {
      const camera = cameraFor(aspect, CAMERA.position, CAMERA.target);
      for (const nudge of [0, AIM_REACH]) {
        const rest = ballPose(0, STRAIGHT_LINE);
        const s = ballOnScreen(camera, rest.x, rest.y, BALL_START_Z - nudge);
        expect(s.x, `aspect ${aspect}`).toBeLessThan(0.95);
        expect(s.y, `aspect ${aspect}`).toBeLessThan(0.95);
        expect(s.bottom, `aspect ${aspect}`).toBeGreaterThan(-0.97);
      }
    }
  });
});
