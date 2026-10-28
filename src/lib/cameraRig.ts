import { BALL_RADIUS, CAMERA, DECK_END_Z, FRONT_ROW_Z, PIN_HEIGHT } from "@/lib/laneLayout";
import { ballPose, type BallLine } from "@/lib/rollAnimation";
import { BALL_TRAVEL_MS } from "@/lib/timing";

export type Vec3 = [number, number, number];

export interface CameraShot {
  pos: Vec3;
  look: Vec3;
}

/** Fraction of the half-frame the ball's edge may reach: it never comes closer to the side than this. */
export const FRAME_MARGIN = 0.82;

/** Where the chased ball sits on screen: this far below the centre (fraction of the half-height), on every screen shape. */
export const CHASE_BALL_Y = -0.42;
/** Highest the top of a pin may come on screen (fraction of the half-height above the centre). */
export const PIN_TOP_Y = 0.85;
/**
 * The chase camera: its height, how far behind the ball, and how far ahead of
 * it it looks. Far enough back that the ball and the pins (taller than the
 * camera is high) fit in one frame, even on a wide, short screen.
 */
const CHASE_HEIGHT = 0.5;
const CHASE_BEHIND = 2.0;
const CHASE_AHEAD = 2.4;
/** Where the camera stops, in front of the front row. */
const CHASE_STOP = 0.6;

const smooth01 = (v: number) => {
  const k = Math.min(1, Math.max(0, v));
  return k * k * (3 - 2 * k);
};
const lerp = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The camera's right-hand direction (level: the camera never rolls). */
function rightOf(pos: Vec3, look: Vec3): Vec3 {
  const f = sub(look, pos);
  return norm([-f[2], 0, f[0]]);
}

/**
 * While the ball rolls: the camera drops in low behind it and chases it down
 * the lane, easing to a stop short of the pins. It follows the ball's line
 * loosely, so a late hook doesn't swing the view, but it slides sideways
 * whenever the ball would otherwise come near the edge of the frame: on a
 * narrow screen (a phone or a portrait panel) the view is too narrow to hold a
 * wide hook. `fov` is the vertical field of view in degrees; `aspect` is
 * width / height.
 */
export function chaseShot(ms: number, line: BallLine, fov: number, aspect: number, bounds: FrameBounds = FULL_FRAME): CameraShot {
  const restPos = CAMERA.position as unknown as Vec3;
  const restLook = CAMERA.target as unknown as Vec3;
  const b = ballPose(Math.min(ms, BALL_TRAVEL_MS + 450), line);
  const stop = FRONT_ROW_Z + CHASE_STOP;
  const z = stop + 0.3 * Math.log1p(Math.exp((b.z - stop) / 0.3));
  const camZ = z + CHASE_BEHIND;
  const k = smooth01(ms / 450);
  // The tilt, as the elevation of the view's centre (whatever the field of
  // view): low enough to hold the ball at CHASE_BALL_Y, but never so low that
  // the tops of the pins leave the frame (near the rack they win).
  const tanHalf = Math.tan(((fov * Math.PI) / 180) / 2);
  const now = ballPose(ms, line);
  const ballDepth = Math.max(CHASE_BEHIND, camZ - Math.max(now.z, DECK_END_Z));
  const forBall = Math.atan((BALL_RADIUS - CHASE_HEIGHT) / ballDepth) + Math.atan(-CHASE_BALL_Y * tanHalf);
  const pinDepth = Math.max(0.3, camZ - FRONT_ROW_Z);
  const forPins = Math.atan((PIN_HEIGHT - CHASE_HEIGHT) / pinDepth) - Math.atan(PIN_TOP_Y * tanHalf);
  const centre = Math.max(forBall, forPins);
  const lookY = CHASE_HEIGHT + Math.tan(centre) * (CHASE_BEHIND + CHASE_AHEAD);
  const pos = lerp(restPos, [b.x * 0.35, CHASE_HEIGHT, camZ], k);
  const look = lerp(restLook, [b.x * 0.2, lookY, z - CHASE_AHEAD], k);
  return keepInFrame({ pos, look }, now, fov, aspect, bounds);
}

/**
 * The part of the frame, left to right in normalised screen space (-1 to 1),
 * where the ball can be seen: narrower than the frame where a panel covers the
 * lane (on the kiosk layout the pin list covers its right-hand side).
 */
export interface FrameBounds {
  left: number;
  right: number;
}
export const FULL_FRAME: FrameBounds = { left: -1, right: 1 };

/**
 * Slides the shot sideways (no turn) just enough that the whole ball stays
 * inside the visible part of the frame (`bounds`, less the margin).
 */
export function keepInFrame(
  shot: CameraShot,
  ball: { x: number; y: number; z: number; visible: boolean },
  fov: number,
  aspect: number,
  bounds: FrameBounds = FULL_FRAME,
): CameraShot {
  if (!ball.visible) return shot;
  const f = norm(sub(shot.look, shot.pos));
  const r = rightOf(shot.pos, shot.look);
  const rel = sub([ball.x, ball.y, ball.z], shot.pos);
  const depth = dot(rel, f);
  if (depth <= BALL_RADIUS * 2) return shot;
  // Half the frame's width at the ball's depth, and the ball's centre and radius as fractions of it.
  const halfWidth = depth * Math.tan(((fov * Math.PI) / 180) / 2) * aspect;
  const centre = dot(rel, r) / halfWidth;
  const radius = BALL_RADIUS / halfWidth;
  // The margin is taken off each visible edge (the strip's own width, scaled like the full frame's).
  const inset = (1 - FRAME_MARGIN) * ((bounds.right - bounds.left) / 2);
  let lo = bounds.left + inset + radius;
  let hi = bounds.right - inset - radius;
  if (lo > hi) lo = hi = (bounds.left + bounds.right) / 2;
  const target = Math.min(hi, Math.max(lo, centre));
  if (target === centre) return shot;
  const shift = (centre - target) * halfWidth;
  const move: Vec3 = [r[0] * shift, r[1] * shift, r[2] * shift];
  return { pos: [shot.pos[0] + move[0], shot.pos[1] + move[1], shot.pos[2] + move[2]], look: [shot.look[0] + move[0], shot.look[1] + move[1], shot.look[2] + move[2]] };
}
