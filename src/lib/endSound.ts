/**
 * End-of-game sounds, synthesised with the Web Audio API (no audio files):
 *
 * - won:  confetti "pops" (in time with the confetti bursts), then a clear rising bell chime.
 * - lost: a soft, short descending "wah-wah", ending on a gentle pitch wobble.
 * - question: a soft two-note rising "ding-ding" as the pre-roll question pops up.
 *
 * Tuned to stay clear on small kiosk speakers: no low thumps, no detuned
 * (chorusing) voices, and an open tone. A light compressor keeps the level
 * even. useGameAudio calls this and owns the context and on/off switch.
 */

export type EndOutcome = "won" | "lost";

/** Every scheduled source is reported so the caller can stop it early. */
type Track = (node: AudioScheduledSourceNode) => void;

/** When the confetti bursts pop, in seconds (Confetti.tsx BURSTS). */
export const CONFETTI_POPS_S = [0] as const;

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** One confetti-cannon pop: a short, bright snap of filtered noise. */
function pop(ctx: BaseAudioContext, out: AudioNode, at: number, brightness: number, track: Track) {
  const snap = ctx.createBufferSource();
  snap.buffer = noiseBuffer(ctx, 0.06);
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = brightness;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.4, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
  snap.connect(high).connect(g).connect(out);
  snap.start(at);
  snap.stop(at + 0.06);
  track(snap);
}

/** A clean bell note: pure sine with two quieter overtones, ringing out. */
function bell(ctx: BaseAudioContext, out: AudioNode, at: number, freq: number, peak: number, ring: number, track: Track) {
  for (const [mult, level] of [
    [1, 1],
    [2, 0.3],
    [3, 0.08],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak * level, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring / mult);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + ring + 0.02);
    track(osc);
  }
}

/** One soft "wah" note; the last one slides down with a pitch wobble. */
function wah(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  seconds: number,
  track: Track,
  slideTo?: number,
) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.32, at + 0.03);
  g.gain.setValueAtTime(0.32, at + seconds * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(1200, at);
  tone.frequency.linearRampToValueAtTime(3200, at + 0.07); // the "wa" opening
  tone.frequency.linearRampToValueAtTime(1800, at + seconds);
  tone.connect(g).connect(out);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + seconds * 0.8);
  // A little square an octave up adds a brassy edge that cuts through small speakers.
  const edge = ctx.createOscillator();
  edge.type = "square";
  edge.frequency.setValueAtTime(freq * 2, at);
  if (slideTo) edge.frequency.exponentialRampToValueAtTime(slideTo * 2, at + seconds * 0.8);
  const edgeLevel = ctx.createGain();
  edgeLevel.gain.value = 0.12;
  osc.connect(tone);
  edge.connect(edgeLevel).connect(tone);

  if (slideTo) {
    // Gentle pitch wobble on the last note.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const depth = ctx.createGain();
    depth.gain.value = 18; // cents
    lfo.connect(depth);
    depth.connect(osc.detune);
    depth.connect(edge.detune);
    lfo.start(at + 0.2);
    lfo.stop(at + seconds);
    track(lfo);
  }

  for (const node of [osc, edge]) {
    node.start(at);
    node.stop(at + seconds + 0.02);
    track(node);
  }
}

/** Light compression so every sound sits at an even, clear level. */
function compressor(ctx: BaseAudioContext, out: AudioNode): DynamicsCompressorNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  comp.connect(out);
  return comp;
}

/** Schedules the question pop-up chime (G5 then D6), starting at audio time `t0`. */
export function scheduleQuestionSound(ctx: BaseAudioContext, out: AudioNode, t0: number, track: Track): void {
  const comp = compressor(ctx, out);
  bell(ctx, comp, t0, 784, 0.26, 0.55, track);
  bell(ctx, comp, t0 + 0.13, 1174.7, 0.28, 0.9, track);
}

/** Schedules the end sound for `outcome`, starting at audio time `t0`. */
export function scheduleEndSound(
  ctx: BaseAudioContext,
  out: AudioNode,
  outcome: EndOutcome,
  t0: number,
  track: Track,
): void {
  const comp = compressor(ctx, out);

  if (outcome === "won") {
    // A double pop for each confetti burst (the cannons fire in pairs).
    CONFETTI_POPS_S.forEach((at, i) => {
      pop(ctx, comp, t0 + at, 2200 + i * 300, track);
      pop(ctx, comp, t0 + at + 0.07, 2800 + i * 200, track);
    });
    // Then C6, E6, G6 and a longer C7: a clear rising sparkle.
    const chime = t0 + 0.25;
    [1046.5, 1318.5, 1568].forEach((f, i) => bell(ctx, comp, chime + i * 0.09, f, 0.3, 0.6, track));
    bell(ctx, comp, chime + 0.27, 2093, 0.32, 1.1, track);
    return;
  }
  // G4, F#4, then F4 sliding to E4.
  wah(ctx, comp, t0, 392, 0.34, track);
  wah(ctx, comp, t0 + 0.38, 370, 0.34, track);
  wah(ctx, comp, t0 + 0.76, 349.2, 0.95, track, 329.6);
}
