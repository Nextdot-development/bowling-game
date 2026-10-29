import {
  BALL_RADIUS,
  BALL_START_Z,
  DECK_END_Z,
  FRONT_ROW_Z,
  GUTTER_WIDTH,
  LANE_HALF_WIDTH,
  PIN_HEIGHT,
  PIN_MAX_RADIUS,
  PIN_SPACING,
  pinRow,
  pinPosition,
} from "@/lib/laneLayout";
import { PINS } from "@/data/gameData";
import { rollLane } from "@/lib/gameLogic";
import { BALL_TRAVEL_MS } from "@/lib/timing";
import type { DrugId, GamePhase, LanePin, LanePins, PinNumber } from "@/types/game";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInQuad = (t: number) => t * t;

/** Average speed from the foul line to the head pin (the ball reaches it at BALL_TRAVEL_MS). */
export const BALL_SPEED = (BALL_START_Z - FRONT_ROW_Z) / (BALL_TRAVEL_MS / 1000);

const SLOWING = 0.25;

/** Fraction of the way to the head pin at fraction `tau` of the travel time. */
function progressAt(tau: number): number {
  if (tau <= 1) return tau * (1 + SLOWING) - SLOWING * tau * tau;
  // Through the pins: each pin it strikes takes some of its momentum, so it
  // eases down (no sudden jolt) to a slower, steady speed, then drops into the pit.
  const x = tau - 1;
  if (x <= EASE_OFF) return 1 + ARRIVE * x - ((ARRIVE - THROUGH_RACK) * x * x) / (2 * EASE_OFF);
  return EASED + THROUGH_RACK * (x - EASE_OFF);
}

/** Speed at the head pin (fraction of the average): the slope of progressAt at tau = 1. */
const ARRIVE = 1 - SLOWING;
/** Travel time (fraction) over which the ball eases from its arrival speed to its speed through the rack. */
const EASE_OFF = 0.15;

/** The ball's speed through the rack, as a fraction of its average speed down the lane: a steady 1.25 m/s (the pins' falls are timed for it), however long the lane. */
const THROUGH_RACK = Math.min(0.7, 1.25 / BALL_SPEED);
/** Progress once the ease-off is done. */
const EASED = 1 + ((ARRIVE + THROUGH_RACK) / 2) * EASE_OFF;

/** Inverse of progressAt up to the head pin: travel fraction at progress `s`. */
function travelFractionAt(s: number): number {
  if (s <= 0) return 0;
  if (s >= EASED) return 1 + EASE_OFF + (s - EASED) / THROUGH_RACK; // steady through the rack
  if (s >= 1) {
    // Easing off: solve 1 + ARRIVE x - (ARRIVE - THROUGH_RACK) x^2 / (2 EASE_OFF) = s.
    const a = (ARRIVE - THROUGH_RACK) / (2 * EASE_OFF);
    if (a < 1e-9) return 1 + (s - 1) / ARRIVE;
    return 1 + (ARRIVE - Math.sqrt(ARRIVE * ARRIVE - 4 * a * (s - 1))) / (2 * a);
  }
  const k = SLOWING;
  return ((1 + k) - Math.sqrt((1 + k) * (1 + k) - 4 * k * s)) / (2 * k);
}

export interface BallPose {
  x: number;
  y: number;
  z: number;
  /** Rotation about the x axis (rolling forward). */
  spin: number;
  /** Heading: rotation about the vertical axis, following the curve. */
  heading: number;
  visible: boolean;
}


export interface BallLine {
  bulge: number;
  pocket: number;
  /** Where the swing is widest: lower peaks early and drifts back slowly, higher holds out longer and hooks late. */
  peak?: number;
  /**
   * A swiped throw: the ball sets off along the swipe and holds that line,
   * hooking into the rack late. Higher is a later, sharper hook. (`bulge` is
   * then how far out it drifts.)
   */
  hook?: number;
  /** Through the rack: sideways drift per metre past the front row (it glances off a pin and veers away). */
  deflect?: number;
  /** A throw at the rack: its angle off the hand (sideways per unit of the way to the pins). */
  launch?: number;
}

/** A straight line down the middle (the resting ball, and the default). */
export const STRAIGHT_LINE: BallLine = { bulge: 0, pocket: 0 };

const CLEAR = BALL_RADIUS + PIN_MAX_RADIUS * 0.92;

/** The pocket: half-way between the head pin and pin 3. */
const POCKET_X = PIN_SPACING / 4;

/** How far across the rack the aim can move the ball's entry (full swipe left or right). */
const AIM_ENTRY = 0.35;

/** A line through the rack: where the ball enters at the front row, and how far it drifts sideways per metre past it. */
export interface RackPath {
  x: number;
  deflect: number;
}

/** Closest the ball comes to a pin at (px, pz) on a rack path. */
function passGap(path: RackPath, px: number, pz: number): number {
  const s = FRONT_ROW_Z - pz; // metres past the front row
  return Math.abs(path.x + path.deflect * s - px) / Math.hypot(1, path.deflect);
}

/** How far out a deflected ball can run: along the far side of the gutter. */
const GUTTER_EDGE = LANE_HALF_WIDTH + GUTTER_WIDTH - BALL_RADIUS;

/**
 * Angles the ball may cross the rack at (sideways metres per metre), straight
 * first. Kept to a real hook ball's entry angle (up to about 8.5°): it reaches
 * the pins already on that angle, so a steeper one would need an unnatural swing.
 */
const DEFLECTS = [0, -0.05, 0.05, -0.1, 0.1, -0.15, 0.15];
/** Where the ball may enter the rack: across the deck, in 1 cm steps. */
const ENTRIES = Array.from({ length: 201 }, (_, i) => Math.round((i - 100) * 1.0) / 100);

/**
 * The ball's line through a rack, chosen so that the ball goes to the pins
 * that fall or shake: every one of them is struck by the ball, or by a pin it
 * sends flying (see rackReactions). It never runs through a pin that stays up
 * and only grazes a pin that just shakes; pins already cleared away are not
 * there. Among the lines that reach every pin, the one where the ball itself
 * strikes the most falling pins wins, then a straight line over a glancing,
 * veering one, then (for a swipe, `aim` -1 to 1) the one nearest where it was
 * aimed, else the one nearest the pocket.
 */
export function rackPath(lane: LanePins, aim: number | null = null): RackPath {
  const falls = PINS.filter(({ number: n }) => lane[n] === "down");
  const up = PINS.filter(({ number: n }) => lane[n] === "up" || lane[n] === "wobble");
  // A strike: into the pocket, between the head pin and pin 3 (or pin 2, for a ball aimed left), as a real strike ball goes.
  if (up.length === 0 && falls.length === PINS.length) return { x: aim !== null && aim < -0.2 ? -POCKET_X : POCKET_X, deflect: 0 };
  const want = aim === null ? null : Math.max(-1, Math.min(1, aim)) * AIM_ENTRY;
  const key = `${PINS.map(({ number: n }) => lane[n][0]).join("")}:${want}`;
  const cached = rackPathCache.get(key);
  if (cached) return cached;

  let best: { path: RackPath; score: number[] } | null = null;
  for (const deflect of DEFLECTS)
    for (const x of ENTRIES) {
      const path = { x, deflect };
      // On the deck all the way past the back row (the ball is held off the gutter's far side).
      if (Math.abs(pathXAt(path, DECK_END_Z)) > GUTTER_EDGE) continue;
      // Never through a pin that stays up (a shaking pin is at most grazed).
      if (up.some(({ number: n }) => passGap(path, pinPosition(n).x, pinPosition(n).z) < CLEAR)) continue;
      const r = computeReactions(lane, path, false);
      const byBall = falls.filter(({ number: n }) => r[n].byBall).length;
      // Falling pins come first, then shaking ones; then the most pins struck by the ball itself.
      const score = [r.unreachedFalls ?? 0, r.unreachedShakes ?? 0, -byBall, deflect === 0 ? 0 : 1, want === null ? Math.abs(Math.abs(x) - 0.12) : Math.abs(x - want), Math.abs(deflect)];
      if (!best || lexLess(score, best.score)) best = { path, score };
    }
  const path = best?.path ?? { x: 0, deflect: 0 };
  rackPathCache.set(key, path);
  return path;
}
const rackPathCache = new Map<string, RackPath>();

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]! - b[i]!) > 1e-9) return a[i]! < b[i]!;
  }
  return false;
}

/** The ball's line through the rack on a fresh throw of `drug` (see rackPath). */
export function rackPathFor(drug: DrugId, aim: number | null = null): RackPath {
  return rackPath(rollLane(drug), aim);
}

/** The ball's line through the rack on a throw, which the pins react to (the same line the ball is drawn on). */
export function throwPath(seed: number | null, drug: DrugId | null, aim: number | null, lane: LanePins | null): RackPath {
  if (!drug) return { x: 0, deflect: 0 };
  if (seed === null) return rackPath(lane ?? rollLane(drug));
  const line = ballLineFor(seed, drug, aim, lane);
  return { x: line.pocket, deflect: line.deflect ?? 0 };
}

/** Where the ball enters the rack on a fresh throw of `drug` (see rackPath). */
export function rackLineX(drug: DrugId, aim: number | null = null): number {
  // Read every frame by each pin: kept per drug and aim, so the rack search runs once.
  const key = `${drug}:${aim}`;
  let x = rackLineCache.get(key);
  if (x === undefined) {
    x = rackPath(rollLane(drug), aim).x;
    rackLineCache.set(key, x);
  }
  return x;
}

const rackLineCache = new Map<string, number>();

/**
 * A throw's line. `lane` is the rack it is thrown at (by default a fresh
 * rack for `drug`); on a second throw it is the rack the first throw left.
 */
export function ballLineFor(seed: number, drug: DrugId | null = null, aim: number | null = null, lane: LanePins | null = null): BallLine {
  // Read every frame by the ball, the camera and each pin: the last line is kept, so the rack search runs once per throw.
  const c = lineCache;
  if (c && c.seed === seed && c.drug === drug && c.aim === aim && c.lane === lane) return c.line;
  const line = computeBallLine(seed, drug, aim, lane);
  lineCache = { seed, drug, aim, lane, line };
  return line;
}

let lineCache: { seed: number; drug: DrugId | null; aim: number | null; lane: LanePins | null; line: BallLine } | null = null;

function computeBallLine(seed: number, drug: DrugId | null, aim: number | null, lane: LanePins | null): BallLine {
  const rack = drug ? (lane ?? rollLane(drug)) : null;
  let a = Math.floor(Math.abs(seed * 1000)) | 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const coin = rand() < 0.5 ? -1 : 1;
  const bulge = 0.14 + rand() * 0.16; // 0.14 to 0.30 out to one side
  const pocket = 0.03 + rand() * 0.04;
  // Every throw has its own shape: how wide it swings and how late it hooks back.
  const swing = 0.05 + rand() * 0.15;
  const peak = 1.1 + rand() * 0.9;
  if (drug && aim !== null && Number.isFinite(aim)) {
    // Thrown by a swipe: the ball sets off the way the finger went and holds
    // that line (further out the more angled the swipe), then hooks late into
    // the rack at the point nearest the aim.
    const a = Math.max(-1, Math.min(1, aim));
    const side = Math.abs(a) < 0.06 ? coin : Math.sign(a);
    const drift = Math.min(0.5, Math.abs(a) * 0.42 + swing);
    const path = rackPath(rack!, a);
    // Off the hand the way the finger went (wider the more angled the swipe), then it hooks to the rack.
    // Swiped away from the side it must enter the rack on, it only leans that way: it never
    // goes out one side and then right across the lane to the other.
    const away = path.x !== 0 && side !== Math.sign(path.x);
    const launch = path.x + side * (0.6 + Math.abs(a) * 2 + swing * 3) * (away ? Math.max(0.15, 0.4 - Math.abs(path.x) * 0.4) : 1);
    return { bulge: side * drift, pocket: path.x, deflect: path.deflect, hook: 2 + rand() * 1.5, launch };
  }
  if (rack) {
    const path = rackPath(rack);
    // Swings out on the side it enters the rack, so it never cuts across the head pin.
    const side = path.x === 0 ? coin : Math.sign(path.x);
    // Not swiped: off the hand almost straight at its entry point, with a little drift of its own.
    const drift = coin * (0.15 + rand() * 0.45) * (path.x !== 0 && coin !== Math.sign(path.x) ? 0.4 : 1);
    return { bulge: side * bulge, pocket: path.x, deflect: path.deflect, peak, launch: path.x * 1.1 + drift };
  }
  return { bulge: coin * bulge, pocket: -coin * pocket, peak }; // hooks back across into the pocket
}


/** u - u^(k+1), scaled to peak at 1: straight out, then a late hook back. */
function hookShape(u: number, k: number): number {
  const top = Math.pow(1 / (k + 1), 1 / k);
  return (u - Math.pow(u, k + 1)) / (top * (k / (k + 1)));
}

/**
 * A throw at the rack, down the lane: one smooth curve. It swings out to one
 * side and back (`bulge`; later for a higher `hook` or `peak`), and reaches the
 * front row at its entry point already heading along its line through the
 * pins, so there is no kink where it meets them.
 */
function approachX(line: BallLine, u: number): number {
  const travel = BALL_START_Z - FRONT_ROW_Z;
  // How sharply it heads across the deck at the pins (sideways per unit of `u`).
  const enter = (line.deflect ?? 0) * travel;
  // Its angle off the hand (sideways per unit of `u`): by default straight at its entry point.
  const launch = line.launch ?? line.pocket;
  // One smooth curve (quintic Hermite): from the release on its launch angle, bending
  // steadily to the entry point, which it reaches on the entry angle and no longer turning.
  const u2 = u * u;
  const u3 = u2 * u;
  const offHand = u - 6 * u3 + 8 * u3 * u - 3 * u3 * u2;
  const toPoint = u3 * (10 - 15 * u + 6 * u2);
  const onAngle = u3 * (-4 + 7 * u - 3 * u2);
  return launch * offHand + line.pocket * toPoint + enter * onAngle;
}

function lineX(line: BallLine, u: number): number {
  // A throw at the pins: the smooth approach that meets its line through the rack.
  if (u <= 1 && line.deflect !== undefined) return approachX(line, u);
  if (u <= 1 && line.hook) return line.bulge * hookShape(u, line.hook) + line.pocket * u * u;
  if (u <= 1) return line.bulge * Math.sin(Math.PI * Math.pow(u, line.peak ?? 1.5)) + line.pocket * u * u;
  // Through the pins: on along its line, between the pins that stay up. A ball
  // that glances off a pin veers away, into the gutter if it carries that far.
  const x = line.pocket + (line.deflect ?? 0) * (u - 1) * (BALL_START_Z - FRONT_ROW_Z);
  return Math.max(-GUTTER_EDGE, Math.min(GUTTER_EDGE, x));
}

export function ballPose(elapsedMs: number, line: BallLine = STRAIGHT_LINE): BallPose {
  const t = Math.max(0, elapsedMs) / 1000;
  const travel = BALL_START_Z - FRONT_ROW_Z;
  const tau = Number.isFinite(t) ? t / (BALL_TRAVEL_MS / 1000) : 4;
  const u = Math.min(3, progressAt(Math.min(tau, 3.5))); // capped: deep in the pit by then
  const z = BALL_START_Z - travel * u + launchLag(t);
  let y = BALL_RADIUS;
  if (z < DECK_END_Z) y -= (DECK_END_Z - z) * 4; // drops into the pit, out of sight
  const x = lineX(line, u);
  const dxdz = (lineX(line, u + 0.001) - x) / (0.001 * travel);
  return {
    x,
    y,
    z,
    spin: -(BALL_START_Z - z) / BALL_RADIUS,
    heading: Math.atan(dxdz),
    visible: Number.isFinite(t) && y > -0.6,
  };
}

/** Seconds over which the ball picks up speed from rest (long before it reaches the pins). */
const LAUNCH_S = 0.35;

/** How far the ball trails its line as it picks up speed: it starts from rest and has caught up by LAUNCH_S. */
function launchLag(t: number): number {
  if (!(t > 0 && t < LAUNCH_S)) return 0;
  const k = t / LAUNCH_S;
  const v0 = BALL_SPEED * (1 + SLOWING); // the line's speed at the foul line
  return v0 * LAUNCH_S * k * (1 - k) * (1 - k);
}

/** Seconds after roll start when the ball reaches a given z. */
function arrivalSeconds(z: number): number {
  const s = (BALL_START_Z - z) / (BALL_START_Z - FRONT_ROW_Z);
  return travelFractionAt(s) * (BALL_TRAVEL_MS / 1000);
}

export interface PinPose {
  /** Offset from the pin's base position. */
  dx: number;
  dz: number;
  lift: number;
  /** Tip axis (unit vector in the ground plane) and angle in radians. */
  axisX: number;
  axisZ: number;
  angle: number;
  /** Spin about the vertical axis, applied after the tip (a skidding pin turning). */
  yaw: number;
  opacity: number;
  /** 0 = normal, 1 = fully dimmed (standing pins after impact). */
  dim: number;
}

/** How far below the deck a pin that slides into the pit is out of sight. */
const PIT_HIDDEN = 0.3;

/** Deterministic 0..1 values per pin, so a pin always goes down the same way. */
function pinRand(n: PinNumber, k: number): number {
  const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** How a knocked pin goes down: its own direction, push, hop and spin. */
function knock(n: PinNumber, react: PinReaction) {
  const base = react.dir;
  // Pins the ball itself strikes are thrown clear of it, harder and faster.
  const inPath = react.byBall;
  const pathX = react.pathX;
  const turn = (pinRand(n, 1) - 0.5) * (inPath ? 0.7 : 0.35); // off its main direction (less for a pin knocked by a pin)
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  const dir = { x: base.x * c - base.z * sn, z: base.x * sn + base.z * c };
  return {
    dir,
    // Struck by the ball: kicked out hard and fast. Knocked by another pin: slower.
    tip: inPath ? 0.16 + pinRand(n, 2) * 0.05 : 0.24 + pinRand(n, 2) * 0.12, // seconds to hit the deck
    speed: inPath ? 2.4 + pinRand(n, 3) * 0.3 : 1.1 + pinRand(n, 3) * 0.7, // m/s off the hit
    hop: pinRand(n, 4) < 0.4 ? 0.7 + pinRand(n, 5) * 0.6 : 0, // some pins fly
    // Turns as it skids, always swinging further from the ball's line (at most ~70°).
    spin: -awayFromPath(n, pathX) * (1 + pinRand(n, 6) * 2), // rad/s about the vertical
  };
}
const FRICTION = 2.4; // m/s² deck friction on a sliding pin
const SPIN_DAMP = 2.5;


/** How a pin reacts on one throw: when it starts to move, which way, and what hit it. */
export interface PinReaction {
  /** Seconds after release that the pin starts to move. */
  start: number;
  /** The way it falls (or rocks): a unit vector on the deck. */
  dir: { x: number; z: number };
  /** Struck by the ball itself (kicked out hard), rather than by another pin. */
  byBall: boolean;
  /** The ball's line across the lane at this pin's row. */
  pathX: number;
}

/** The ball's centre this close to a pin's centre touches it. */
const HIT = CLEAR + 0.03;
/** A falling pin takes out a pin standing within this distance (most of its length). */
const KNOCK_REACH = PIN_HEIGHT * 0.95;
/** A pin struck by a falling pin starts to move this long after the falling pin did (plus a little more the further away it is). */
const KNOCK_DELAY = 0.1;
const KNOCK_TRAVEL = 0.18;

/** Where the ball is across the lane as it passes depth `z` on its line through the rack. */
function pathXAt(path: RackPath, z: number): number {
  return path.x + path.deflect * (FRONT_ROW_Z - z);
}

const unit = (x: number, z: number) => {
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
};

/**
 * Every pin's reaction to a throw at `lane` along `path`. A pin the ball
 * touches moves the moment the ball reaches it; a pin the ball misses is taken
 * out by a falling neighbour (pin action): it moves just after that pin, and
 * falls away from it. Only a pin that neither can reach falls (or shakes) as
 * the ball passes its row — rackPath picks lines that leave none of those.
 */
export function rackReactions(lane: LanePins, path: RackPath, strike = false): Record<PinNumber, PinReaction> {
  const c = reactionCache;
  if (c && c.lane === lane && c.x === path.x && c.deflect === path.deflect && c.strike === strike) return c.out;
  const out = computeReactions(lane, path, strike);
  reactionCache = { lane, x: path.x, deflect: path.deflect, strike, out };
  return out;
}
let reactionCache: { lane: LanePins; x: number; deflect: number; strike: boolean; out: Record<PinNumber, PinReaction> } | null = null;

function computeReactions(lane: LanePins, path: RackPath, strike: boolean): Record<PinNumber, PinReaction> & { unreachedFalls?: number; unreachedShakes?: number } {
  const out = {} as Record<PinNumber, PinReaction>;
  const reacts = (n: PinNumber) => lane[n] === "down" || lane[n] === "wobble";
  if (strike) {
    for (const { number: n } of PINS) {
      const local = pathXAt(path, pinPosition(n).z);
      out[n] = { start: pinReactionStart(n, path.x, true), dir: fallDirection(n, local), byBall: inBallPath(n, local), pathX: local };
    }
    return out;
  }
  // The ball: every reacting pin it touches.
  for (const { number: n } of PINS) {
    if (!reacts(n)) continue;
    const { x, z } = pinPosition(n);
    const gap = passGap(path, x, z);
    if (gap >= HIT) continue;
    const local = pathXAt(path, z);
    // Thrown out to the side of the ball's line and on the way it is going (along its angle through the rack).
    const side = awayFromPath(n, local);
    const along = unit(path.deflect, -1);
    const dir = unit(side * -along.z + 0.45 * along.x, side * along.x + 0.45 * along.z);
    out[n] = { start: arrivalSeconds(z + Math.sqrt(Math.max(0, HIT * HIT - gap * gap))), dir, byBall: true, pathX: local };
  }
  // Pin action: falling pins take out the reacting pins within reach, earliest first.
  for (;;) {
    let best: { n: PinNumber; from: PinNumber; t: number } | null = null;
    for (const { number: n } of PINS) {
      if (!reacts(n) || out[n]) continue;
      const p = pinPosition(n);
      for (const { number: m } of PINS) {
        if (lane[m] !== "down" || !out[m]) continue;
        const q = pinPosition(m);
        const d = Math.hypot(p.x - q.x, p.z - q.z);
        if (d > KNOCK_REACH) continue;
        const t = out[m].start + KNOCK_DELAY + (KNOCK_TRAVEL * d) / KNOCK_REACH;
        if (!best || t < best.t) best = { n, from: m, t };
      }
    }
    if (!best) break;
    const p = pinPosition(best.n);
    const q = pinPosition(best.from);
    // Away from the pin that hit it, and on back toward the pit.
    const away = unit(p.x - q.x, p.z - q.z);
    out[best.n] = { start: best.t, dir: unit(away.x, away.z - 0.35), byBall: false, pathX: pathXAt(path, p.z) };
  }
  // Everything else: as the ball passes its row. A pin that falls or shakes but
  // that nothing reaches goes only once the first pins are hit (never before the crash).
  const firstCrash = Math.min(...PINS.filter(({ number: n }) => lane[n] === "down" && out[n]).map(({ number: n }) => out[n].start));
  let unreachedFalls = 0;
  let unreachedShakes = 0;
  for (const { number: n } of PINS) {
    if (out[n]) continue;
    if (lane[n] === "down") unreachedFalls++;
    if (lane[n] === "wobble") unreachedShakes++;
    const local = pathXAt(path, pinPosition(n).z);
    const start = pinReactionStart(n, local);
    out[n] = {
      start: reacts(n) && Number.isFinite(firstCrash) ? Math.max(firstCrash + 0.12, Math.min(start, firstCrash + 0.4)) : start,
      dir: fallDirection(n, local),
      byBall: false,
      pathX: local,
    };
  }
  return Object.assign(out, { unreachedFalls, unreachedShakes });
}

/** Seconds after release when the ball (or a pin it sends flying) first knocks a pin down on this throw; null if none falls. */
export function firstKnockSeconds(lane: LanePins, path: RackPath, strike = false): number | null {
  const reactions = rackReactions(lane, path, strike);
  const starts = PINS.filter(({ number: n }) => lane[n] === "down").map(({ number: n }) => reactions[n].start);
  return starts.length ? Math.min(...starts) : null;
}

/** A pin's reaction on its own, with the ball on a straight line at `pathX` (no other pins considered). */
function soloReaction(n: PinNumber, pathX = 0, strike = false): PinReaction {
  return { start: pinReactionStart(n, pathX, strike), dir: fallDirection(n, pathX), byBall: inBallPath(n, pathX), pathX };
}

export function pinReactionStart(n: PinNumber, pathX = 0, strike = false): number {
  const { x, z } = pinPosition(n);
  const impact = arrivalSeconds(FRONT_ROW_Z + Math.sqrt(Math.max(0, CLEAR * CLEAR - pathX * pathX)));
  // A strike: the ball drives into the pocket and the whole rack goes off
  // almost at once, the hit racing back through the pins.
  if (strike) return impact + 0.035 * pinRow(n) + 0.015 * Math.abs(x - pathX);
  // A pin the ball strikes moves the moment the ball touches it.
  const dx = Math.abs(x - pathX);
  if (dx < CLEAR + 0.03) return arrivalSeconds(z + Math.sqrt(Math.max(0, (CLEAR + 0.03) ** 2 - dx * dx)));
  // Others are knocked over by their neighbours as the ball passes their row.
  return Math.max(impact, arrivalSeconds(z + CLEAR)) + 0.03 * Math.abs(x);
}

/** Whether pin `n` stands in or right beside the ball's line through the rack. */
function inBallPath(n: PinNumber, pathX: number): boolean {
  return Math.abs(pinPosition(n).x - pathX) < CLEAR + 0.05;
}

/** Which side of the ball's line (`pathX`) pin `n` is pushed to: +1 right, -1 left. */
function awayFromPath(n: PinNumber, pathX: number): number {
  const { x } = pinPosition(n);
  if (x !== pathX) return Math.sign(x - pathX);
  return Math.sign(x) || (n % 2 === 0 ? -1 : 1);
}

export function fallDirection(n: PinNumber, pathX = 0): { x: number; z: number } {
  const { x } = pinPosition(n);
  const away = awayFromPath(n, pathX);
  if (inBallPath(n, pathX)) {
    const len = Math.hypot(1, 0.45);
    return { x: away / len, z: -0.45 / len };
  }
  const side = away * (0.6 + Math.abs(x - pathX));
  const len = Math.hypot(side, 1);
  return { x: side / len, z: -1 / len };
}

/** Kickback walls: no part of a sliding pin gets further than this from the centre-line. */
const WALL_X = LANE_HALF_WIDTH + GUTTER_WIDTH - PIN_MAX_RADIUS;

/** A half-knocked pin's first lean (radians) and how fast its rocking dies away. */
const ROCK_ANGLE = 0.56;
const ROCK_DECAY = 1.7;
const ROCK_HZ = 3;
/** How far the base shuffles on the deck while it rocks (metres). */
const ROCK_SHUFFLE = PIN_MAX_RADIUS * 0.35;
/** The rocking ends exactly by then (seconds after the hit), upright and back on its spot. */
const ROCK_SECONDS = 2.6;

/** A pin's pose `elapsedMs` after release. `react`: how it reacts on this throw (rackReactions); by default, to a ball straight down the middle. */
export function pinPose(n: PinNumber, falls: boolean, elapsedMs: number, wobbles = false, react: PinReaction = soloReaction(n)): PinPose {
  const u = elapsedMs / 1000 - react.start;
  const rest: PinPose = { dx: 0, dz: 0, lift: 0, axisX: 1, axisZ: 0, angle: 0, yaw: 0, opacity: 1, dim: 0 };
  if (u <= 0) return rest;

  if (!falls && wobbles) {
    // Tip toward the fall direction, rock back past upright, and settle.
    // The swings shrink to nothing well before the result is shown.
    const dir = react.dir;
    if (!(u < ROCK_SECONDS)) return { ...rest, dim: 1 };
    const fade = Math.exp(-ROCK_DECAY * u) * (1 - u / ROCK_SECONDS);
    const angle = ROCK_ANGLE * fade * Math.sin(2 * Math.PI * ROCK_HZ * u);
    // The base chatters on the deck as it rocks, pushed along the hit (never back into whatever hit it).
    const shuffle = ROCK_SHUFFLE * fade * Math.abs(Math.sin(2 * Math.PI * ROCK_HZ * 2 * u));
    return {
      ...rest,
      dx: dir.x * shuffle,
      dz: dir.z * shuffle,
      // Rocks on the edge of its base, so it lifts a little as it leans.
      lift: PIN_MAX_RADIUS * 0.6 * Math.abs(Math.sin(angle)),
      axisX: dir.z,
      axisZ: -dir.x,
      angle,
      dim: clamp01(u / 0.9),
    };
  }

  if (!falls) {
    // Not in the shaking category: it stays perfectly still (upright, dimmed).
    return { ...rest, dim: clamp01(u / 0.45) };
  }

  const k = knock(n, react);
  const t = Number.isFinite(u) ? Math.min(u, 3) : 3;
  const tipped = clamp01(t / k.tip);
  const landed = Math.max(0, t - k.tip);
  const bounce = landed > 0 ? 0.14 * Math.exp(-9 * landed) * Math.sin(26 * landed) : 0;
  // Struck, it starts turning at once (not from rest), and gravity speeds it up as it goes over.
  const angle = (Math.PI / 2 - 0.04) * (0.4 * tipped + 0.6 * easeInQuad(tipped)) - Math.abs(bounce);
  const stopAt = k.speed / FRICTION;
  const st = Math.min(t, stopAt);
  const slide = k.speed * st - 0.5 * FRICTION * st * st;
  const air = k.hop > 0 ? Math.max(0, k.hop * t - 4.9 * t * t) : 0;
  const yaw = (k.spin / SPIN_DAMP) * (1 - Math.exp(-SPIN_DAMP * Math.max(0, t - 0.1)));
  const { x, z } = pinPosition(n);
  const zNow = z + k.dir.z * slide;
  const pit = zNow < DECK_END_Z ? (DECK_END_Z - zNow) * 2.2 : 0;
  // The kickbacks stop it: its base stops at the wall, and a pin whose body
  // would reach through the wall turns to lie along it instead.
  const baseX = Math.max(-WALL_X, Math.min(WALL_X, x + k.dir.x * slide));
  const lean = Math.sin(angle) * PIN_HEIGHT;
  const lies = { x: k.dir.x * Math.cos(yaw) + k.dir.z * Math.sin(yaw), z: -k.dir.x * Math.sin(yaw) + k.dir.z * Math.cos(yaw) };
  const room = WALL_X - Math.sign(lies.x) * baseX;
  let turned = yaw;
  if (lean > 1e-6 && Math.abs(lies.x) * lean > room) {
    const nx = Math.sign(lies.x) * Math.max(0, room / lean);
    const nz = -Math.sqrt(1 - nx * nx);
    turned = Math.atan2(k.dir.z * nx - k.dir.x * nz, k.dir.x * nx + k.dir.z * nz);
  }
  return {
    dx: baseX - x,
    dz: k.dir.z * slide,
    lift: PIN_MAX_RADIUS * 0.92 * Math.sin(angle) + air - Math.min(pit, PIT_HIDDEN * 2),
    // Axis = up × dir, so rotating "up" by +angle tips the pin toward dir.
    axisX: k.dir.z,
    axisZ: -k.dir.x,
    angle,
    yaw: turned,
    // Only a pin that has dropped into the pit passes out of sight.
    opacity: 1 - clamp01((pit - PIT_HIDDEN * 0.6) / (PIT_HIDDEN * 0.4)),
    dim: 0,
  };
}

export const AIM_REACH = 0.35;
/** The swipe's forward nudge eases out over this long, so the ball picks up its roll without a hitch. */
export const AIM_BLEND_MS = 600;

export function aimOffset(phase: GamePhase, elapsedMs: number, aim: number): number {
  const a = Math.min(1, Math.max(0, aim));
  if (phase === "ready") return a * AIM_REACH;
  if (phase === "rolling") {
    const k = Math.min(1, Math.max(0, elapsedMs / AIM_BLEND_MS));
    return a * AIM_REACH * (1 - k * k * (3 - 2 * k));
  }
  return 0;
}

/** Seconds from roll start until the ball reaches a given z (for sound sync). */
export function ballArrivalSeconds(z: number): number {
  return arrivalSeconds(z);
}

export const SETTER = { barDown: 0.3, swept: 1.0, barUp: 1.3, liftUp: 0.3, setDown: 1.3, rackStart: 1.05, rackSet: 1.75, tableUp: 2.1 } as const;
export const BAR_PARK_Y = 1.6;
export const BAR_HEIGHT = 0.28;
const BAR_FRONT_Z = FRONT_ROW_Z + 0.4;
const BAR_BACK_Z = DECK_END_Z - 0.2;
/** How high the table lifts the standing pins, and the height a fresh rack is lowered from. */
const TABLE_LIFT = 0.55;
const RACK_DROP = 0.9;
const smooth = (v: number) => v * v * (3 - 2 * v);
const ramp = (s: number, from: number, to: number) => clamp01((s - from) / (to - from));

/** The sweep bar `s` seconds into the cycle: its bottom edge and where it is along the deck (null when parked). */
export function sweepBar(s: number): { y: number; z: number } | null {
  if (!Number.isFinite(s) || s < 0 || s > SETTER.barUp) return null;
  const y = BAR_PARK_Y * (1 - smooth(ramp(s, 0, SETTER.barDown))) + BAR_PARK_Y * smooth(ramp(s, SETTER.swept, SETTER.barUp));
  const z = BAR_FRONT_Z + (BAR_BACK_Z - BAR_FRONT_Z) * smooth(ramp(s, SETTER.barDown, SETTER.swept));
  return { y, z };
}

/** How high the setter table holds the standing pins before a second throw. */
export function tableLift(s: number): number {
  if (!Number.isFinite(s) || s < 0) return 0;
  return TABLE_LIFT * smooth(ramp(s, 0, SETTER.liftUp)) * (1 - smooth(ramp(s, SETTER.swept, SETTER.setDown)));
}

/** Between frames: how far above its spot the fresh rack is (null before it appears). */
export function freshRackLift(s: number): number | null {
  if (!Number.isFinite(s) || s < SETTER.rackStart) return null;
  return RACK_DROP * (1 - smooth(ramp(s, SETTER.rackStart, SETTER.rackSet)));
}

const HIDDEN: PinPose = { dx: 0, dz: 0, lift: 0, axisX: 1, axisZ: 0, angle: 0, yaw: 0, opacity: 0, dim: 0 };
const UPRIGHT: PinPose = { ...HIDDEN, opacity: 1 };

/** A pin pushed back by the sweep bar from `rest`; over the end of the deck it drops into the pit, out of sight. */
function swept(n: PinNumber, rest: PinPose, s: number): PinPose {
  if (rest.opacity === 0) return rest;
  const bar = s >= SETTER.barDown ? sweepBar(s) : null;
  const z0 = pinPosition(n).z;
  const lying = rest.angle > 0.5;
  let z = z0 + rest.dz;
  if (bar) z = Math.min(z, bar.z - (lying ? 0.18 : PIN_MAX_RADIUS + 0.05));
  else if (s >= SETTER.swept) z = BAR_BACK_Z - 0.2;
  const drop = z < DECK_END_Z ? (DECK_END_Z - z) * 3.5 : 0;
  return { ...rest, dz: z - z0, lift: rest.lift - drop, opacity: 1 - clamp01((drop - 0.15) / 0.2) };
}

export interface LanePoseContext {
  /** The ball's line through the rack (rackPathFor, or the throw's ballLineFor). */
  path: RackPath;
  /** Every pin's state on this throw (which fall, shake or stay up); null before any throw. */
  lane: LanePins | null;
  /** Every pin falls on this throw. */
  strike: boolean;
  /** This throw is a second throw: the pinsetter clears the deadwood first. */
  sweeping: boolean;
  /** Ms since the between-frames reset started (null: not yet). */
  resetSinceMs: number | null;
}

export function lanePinPose(n: PinNumber, status: LanePin, phase: GamePhase, elapsedMs: number, ctx: LanePoseContext): PinPose {
  const { path, lane, strike, sweeping, resetSinceMs } = ctx;
  const react = lane ? rackReactions(lane, path, strike)[n] : soloReaction(n, path.x, strike);
  if (phase === "transition") {
    const before = status === "gone" || status === "down" ? finalPinPose(n, true, false, react) : UPRIGHT;
    if (resetSinceMs === null || resetSinceMs < 0) return before;
    const s = resetSinceMs / 1000;
    const fresh = freshRackLift(s);
    if (fresh !== null) return { ...UPRIGHT, lift: fresh };
    return swept(n, before, s);
  }
  const s = elapsedMs / 1000;
  // Knocked down by an earlier throw of the frame: cleared away, so the second
  // throw is at the standing pins only (client request).
  if (status === "gone") return sweeping && phase === "rolling" ? swept(n, finalPinPose(n, true, false, soloReaction(n, path.x)), s) : HIDDEN;
  const pose = pinPose(n, status === "down", elapsedMs, status === "wobble", react);
  return sweeping && phase === "rolling" ? { ...pose, lift: pose.lift + tableLift(s) } : pose;
}

/** Final pose used for the result state and reduced-motion rolls. */
export function finalPinPose(n: PinNumber, falls: boolean, wobbles = false, react?: PinReaction): PinPose {
  return pinPose(n, falls, Number.POSITIVE_INFINITY, wobbles, react);
}
