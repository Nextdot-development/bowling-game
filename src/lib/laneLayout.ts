import type { PinNumber } from "@/types/game";

/** Half the lane's width: a wide main lane, so it fills most of the screen between the side panels. */
export const LANE_HALF_WIDTH = 1.2;
export const GUTTER_WIDTH = 0.22;
/** Centre-to-centre distance to the neighbouring lanes of the arena (scenery). */
export const NEIGHBOUR_LANE_SPACING = LANE_HALF_WIDTH * 2 + GUTTER_WIDTH * 2 + 0.55;
export const LANE_NEAR_Z = 1.2;
export const FOUL_LINE_Z = 0.42;
export const ARROWS_Z = -3.4;

export const BALL_RADIUS = 0.11;
export const BALL_START_Z = -0.05;

/**
 * The ball return beside the approach (left of the lane): its centre-line and
 * the length of its rails. Balls rest on it one behind the other.
 */
export const RACK_X = -(LANE_HALF_WIDTH + GUTTER_WIDTH + 0.3);
export const RACK_LENGTH = 1.15;
/** Middle of the rails along the lane: the hood end is the far end. */
export const RACK_Z = -0.68;
export function rackBallPosition(index: number): { x: number; z: number } {
  return { x: RACK_X, z: -0.78 + index * 0.44 };
}

/** Intro screen: Player 1's balls sit side by side at the start position, centred. */
export const INTRO_BALL_SPACING = 0.7;
export function introBallX(index: number, count: number): number {
  return (index - (count - 1) / 2) * INTRO_BALL_SPACING;
}

export const PIN_HEIGHT = 0.7;
export const PIN_MAX_RADIUS = 0.104;
/** Centre-to-centre distance between neighbouring pins in the rack. */
export const PIN_SPACING = 0.46;

/** Pin silhouette: [height fraction, radius as a fraction of max]. */
export const PIN_PROFILE: readonly (readonly [number, number])[] = [
  [0.0, 0.52],
  [0.04, 0.66],
  [0.14, 0.86],
  [0.27, 1.0],
  [0.39, 0.93],
  [0.5, 0.72],
  [0.6, 0.48],
  [0.67, 0.4],
  [0.74, 0.43],
  [0.83, 0.54],
  [0.9, 0.53],
  [0.955, 0.42],
  [0.985, 0.24],
  [1.0, 0.0],
];

/** The head pin (pin 1), the point of the triangle nearest the bowler. */
export const FRONT_ROW_Z = -12.5;
/**
 * Depth between rows. Deeper than an equilateral rack (0.40), so that from the
 * bowler's end each row stands clearly behind the one in front, as the rack
 * looks from a raised view of a real lane.
 */
export const ROW_GAP = 0.6;
export const DECK_END_Z = -14.65;
export const PIT_BACK_Z = -15.25;

export const CAMERA = {
  // Low and a little further back, zoomed in: big pins near the top of the
  // lane (just under the card), the ball near the foot, the lane filling the view.
  position: [0, 1.4, 3.6] as const,
  target: [0, -0.5, -5] as const,
  /** Horizontal field of view the framing is designed around. */
  horizontalFov: 50.8,
  // A little headroom so the back row clears the card at the top of the lane
  // and the ball clears the bottom edge, even on wide, short browser windows.
  minVerticalFov: 26,
  maxVerticalFov: 62,
};

/** Vertical FOV that keeps the lane framed at any aspect ratio. */
export function verticalFovFor(aspect: number): number {
  // Narrow stages (phones, portrait tablets) zoom in on the deck a little.
  const hfov = Math.min(CAMERA.horizontalFov, Math.max(42, CAMERA.horizontalFov - (1.8 - aspect) * 22));
  const h = (hfov * Math.PI) / 180;
  const v = (2 * Math.atan(Math.tan(h / 2) / Math.max(aspect, 0.1)) * 180) / Math.PI;
  return Math.min(CAMERA.maxVerticalFov, Math.max(CAMERA.minVerticalFov, v));
}

/**
 * The rack: the full ten-pin triangle pointing at the bowler, numbered as in
 * real bowling. [column, row]: columns in half-spacings from the centre-line,
 * rows counted back from the head pin.
 *
 *        7   8   9   10
 *          4   5   6
 *            2   3
 *              1        <- bowler
 */
const RACK: Readonly<Record<PinNumber, readonly [number, number]>> = {
  1: [0, 0],
  2: [-1, 1],
  3: [1, 1],
  4: [-2, 2],
  5: [0, 2],
  6: [2, 2],
  7: [-3, 3],
  8: [-1, 3],
  9: [1, 3],
  10: [3, 3],
};

/** Row of a pin in the rack (0 = head pin). */
export function pinRow(n: PinNumber): number {
  return RACK[n][1];
}

export function pinPosition(n: PinNumber): { x: number; z: number } {
  const [col, row] = RACK[n];
  return { x: (col * PIN_SPACING) / 2, z: FRONT_ROW_Z - row * ROW_GAP };
}
