import { DECK_END_Z, FRONT_ROW_Z } from "@/lib/laneLayout";
import { ballArrivalSeconds } from "@/lib/rollAnimation";

export const SOUND_FILES = {
  /** Ball set down on the lane, then rolling (4.5 s, no pin crash). */
  roll: "/soundeffects/freesound_community-bowling-ball-90863.mp3",
  /** Pins being struck and scattering (1.4 s). */
  strike: "/soundeffects/freesound_community-bowling-strike-40456.mp3",
} as const;

export type SoundName = keyof typeof SOUND_FILES;

/** The end-of-throw jingles: a win for the strike, a "lost" sting for a throw that leaves pins up. */
export const END_SOUND_FILES = {
  won: "/soundeffects/GameWin.mp3",
  lost: "/soundeffects/GameLost.mp3",
} as const;

/** Background music, looped quietly under the whole game. */
export const BGM_FILE = "/soundeffects/bgm.mp3";

/**
 * Levels: the music plays at one steady level the whole time; the sound
 * effects play well above it so every one is clearly heard over the music.
 */
export const BGM_LEVEL = 0.22;
export const SFX_LEVEL = 1.6;

export const SOUND_ONSETS: Readonly<Record<SoundName, number>> = {
  roll: 0.125,
  strike: 0.198,
};

export interface SoundCue {
  sound: SoundName;
  /** Seconds after the roll starts at which the file's onset should be heard. */
  at: number;
  /** Peak gain 0..1. */
  gain: number;
  /**
   * If set, the gain rises to `gain` between `from` and `to` (seconds after
   * the roll starts): the roll recording's rolling is much quieter than the
   * thud of the ball being set down, so it is brought up after the thud.
   */
  boost?: { from: number; to: number; gain: number };
  /** If set, the file loops between these two points (seconds into the file) once it reaches the end one. */
  loop?: readonly [number, number];
  /** If set, fade out over [fadeFrom, fadeTo] (seconds after roll start). */
  fadeFrom?: number;
  fadeTo?: number;
}

/** Seconds from release until the ball meets the front row of pins. */
export const IMPACT_SECONDS = ballArrivalSeconds(FRONT_ROW_Z);

/** The rolling after the set-down thud, brought up to be clearly heard down the lane. */
export const ROLL_BOOST = { from: 0.25, to: 0.6, gain: 3.6 } as const;

/** The steady rolling part of the roll recording (seconds into the file), clean of any clicks. */
export const ROLL_LOOP = [1.0, 1.6] as const;

/** Seconds from release until the ball leaves the deck and drops into the pit. */
export const PIT_SECONDS = ballArrivalSeconds(DECK_END_Z);

/** `hitAt`: seconds after release when the first pin is knocked (rackReactions); by default when the ball reaches the head pin. */
export function buildSoundCues(pinsDown: number, totalPins: number, instant = false, hitAt = IMPACT_SECONDS): SoundCue[] {
  const strikeGain = 0.55 + 0.45 * Math.max(0, Math.min(1, pinsDown / totalPins));
  // The ball is heard rolling the whole way, through the pins until it drops
  // into the pit. Past the set-down thud only the clean rolling part of the
  // recording is used (looped): its later part has clicks that sound like pins.
  const roll: SoundCue = { sound: "roll", at: 0, gain: 0.9, boost: ROLL_BOOST, loop: ROLL_LOOP, fadeFrom: PIT_SECONDS - 0.5, fadeTo: PIT_SECONDS };
  // No pin falls (the second throw only shakes the standing pins): no crash.
  // The ball keeps rolling through the rack until it drops into the pit. Only
  // the steady rolling part of the recording is used (looped): its later part
  // has faint clicks that could be heard as pins.
  if (pinsDown <= 0) return instant ? [] : [roll];
  if (instant) return [{ sound: "strike", at: 0.05, gain: strikeGain }];
  return [roll, { sound: "strike", at: hitAt, gain: strikeGain }];
}
