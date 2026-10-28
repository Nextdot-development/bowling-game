/**
 * Interface sound effects, synthesised with the Web Audio API (no audio files):
 *
 * - tap:    a soft, low "pop" for buttons, as in mobile games.
 * - key:    a lighter pop for the on-screen keyboard.
 * - select: a ball being picked up off the return: a low wooden knock and a warm ping.
 * - popup:  a soft, low whoosh as a pop-up opens.
 * - rack:   the pinsetter: a mechanical whir as the bar sweeps, a clunk as it
 *           clears the deck, and a clatter as the fresh rack is set (SETTER timings).
 *
 * Buttons choose their sound with a `data-sound` attribute (on the button or a
 * parent): "key", "select" or "none"; any other button taps. Other components
 * ask for a sound with `emitGameSound`. useGameAudio plays them when sound is on.
 */

import { SETTER } from "@/lib/rollAnimation";

export type UiSound = "tap" | "key" | "select" | "popup" | "rack";

type Track = (node: AudioScheduledSourceNode) => void;

/** The window event other components use to ask for a sound. */
export const GAME_SOUND_EVENT = "game-sound";

export function emitGameSound(name: UiSound): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<UiSound>(GAME_SOUND_EVENT, { detail: name }));
}

/** The sound for a tap on `target`, or null for none (not a button, or a button with its own sound). */
export function soundForTarget(target: EventTarget | null): UiSound | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest("button, [role='button']");
  if (!button || (button as HTMLButtonElement).disabled) return null;
  const tagged = button.closest("[data-sound]")?.getAttribute("data-sound");
  if (tagged === "none") return null;
  if (tagged === "key" || tagged === "select") return tagged;
  return "tap";
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A short pitched blip with a fast decay. */
function blip(ctx: BaseAudioContext, out: AudioNode, at: number, freq: number, peak: number, decay: number, type: OscillatorType, track: Track, slideTo?: number) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.02);
  track(osc);
}

/** A burst of filtered noise. */
function noise(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  seconds: number,
  filter: { type: BiquadFilterType; from: number; to?: number; q?: number },
  peak: number,
  track: Track,
  attack = 0.003,
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, seconds);
  const f = ctx.createBiquadFilter();
  f.type = filter.type;
  f.Q.value = filter.q ?? 0.8;
  f.frequency.setValueAtTime(filter.from, at);
  if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, at + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + seconds + 0.02);
  track(src);
}

/** A low mechanical clunk: a thud with a short knock on top. */
function clunk(ctx: BaseAudioContext, out: AudioNode, at: number, level: number, track: Track) {
  blip(ctx, out, at, 150, 0.5 * level, 0.16, "sine", track, 70);
  noise(ctx, out, at, 0.07, { type: "bandpass", from: 900, q: 1.2 }, 0.35 * level, track);
}

/** Schedules `name` at audio time `t0`. */
export function scheduleUiSound(ctx: BaseAudioContext, out: AudioNode, name: UiSound, t0: number, track: Track): void {
  switch (name) {
    case "tap":
      // A soft, rounded game pop: a low sine that drops in pitch.
      blip(ctx, out, t0, 420, 0.22, 0.09, "sine", track, 210);
      noise(ctx, out, t0, 0.02, { type: "lowpass", from: 1800 }, 0.05, track);
      return;
    case "key":
      blip(ctx, out, t0, 600, 0.12, 0.05, "sine", track, 380);
      return;
    case "select":
      // Ball lifted off the rail: a low wooden knock, a second softer one, then a warm ping.
      noise(ctx, out, t0, 0.07, { type: "bandpass", from: 420, q: 2 }, 0.4, track);
      blip(ctx, out, t0, 170, 0.4, 0.14, "sine", track, 110);
      noise(ctx, out, t0 + 0.08, 0.05, { type: "bandpass", from: 520, q: 2 }, 0.22, track);
      blip(ctx, out, t0 + 0.13, 784, 0.18, 0.4, "sine", track);
      blip(ctx, out, t0 + 0.13, 1568, 0.04, 0.22, "sine", track);
      return;
    case "popup":
      noise(ctx, out, t0, 0.34, { type: "bandpass", from: 260, to: 1500, q: 0.9 }, 0.16, track, 0.09);
      blip(ctx, out, t0 + 0.07, 262, 0.1, 0.28, "sine", track, 440);
      return;
    case "rack": {
      // Motor whir under the whole cycle, louder while the bar sweeps.
      const whir = ctx.createOscillator();
      whir.type = "sawtooth";
      whir.frequency.setValueAtTime(70, t0);
      whir.frequency.linearRampToValueAtTime(95, t0 + SETTER.swept);
      whir.frequency.linearRampToValueAtTime(80, t0 + SETTER.tableUp);
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.2);
      g.gain.setValueAtTime(0.09, t0 + SETTER.swept);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + SETTER.rackStart);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + SETTER.tableUp + 0.2);
      whir.connect(tone).connect(g).connect(out);
      whir.start(t0);
      whir.stop(t0 + SETTER.tableUp + 0.25);
      track(whir);
      // The sweep bar brushing the deck, then its clunk as it clears it.
      noise(ctx, out, t0 + SETTER.barDown, SETTER.swept - SETTER.barDown, { type: "bandpass", from: 1400, to: 700, q: 0.7 }, 0.07, track, 0.1);
      clunk(ctx, out, t0 + SETTER.barDown, 0.6, track);
      clunk(ctx, out, t0 + SETTER.swept, 0.8, track);
      // The new pins touching down: a light wooden clatter.
      for (const [dt, f] of [
        [0, 1900],
        [0.04, 2300],
        [0.09, 2100],
        [0.15, 2500],
      ] as const)
        noise(ctx, out, t0 + SETTER.rackSet + dt, 0.04, { type: "bandpass", from: f, q: 3 }, 0.22, track);
      clunk(ctx, out, t0 + SETTER.tableUp, 0.5, track);
      return;
    }
  }
}
