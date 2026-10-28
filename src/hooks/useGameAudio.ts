"use client";

import { useCallback, useEffect, useRef } from "react";
import { scheduleEndSound, scheduleQuestionSound, type EndOutcome } from "@/lib/endSound";
import { BGM_FILE, BGM_LEVEL, SFX_LEVEL, buildSoundCues, END_SOUND_FILES, SOUND_FILES, SOUND_ONSETS, type SoundName } from "@/lib/rollSound";
import { GAME_SOUND_EVENT, scheduleUiSound, soundForTarget, type UiSound } from "@/lib/uiSound";

export function useGameAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Partial<Record<SoundName, AudioBuffer>>>({});
  const loadingRef = useRef<Promise<void> | null>(null);
  const activeRef = useRef<Set<AudioScheduledSourceNode>>(new Set());
  const endBuffersRef = useRef<Partial<Record<EndOutcome, AudioBuffer>>>({});
  /** The background music: a looping audio element routed through its own gain, so it can dip under effects. */
  const bgmRef = useRef<{ el: HTMLAudioElement; gain: GainNode } | null>(null);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      // Effects play well above the music (which stays at one steady level); a
      // limiter keeps the louder effects clean on small kiosk speakers.
      master.gain.value = SFX_LEVEL;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.1;
      master.connect(limiter).connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    if (!loadingRef.current) {
      // Fetch and decode both recordings once; they are small local files.
      loadingRef.current = Promise.all(
        (Object.keys(SOUND_FILES) as SoundName[]).map(async (name) => {
          try {
            const res = await fetch(SOUND_FILES[name]);
            buffersRef.current[name] = await ctx.decodeAudioData(await res.arrayBuffer());
          } catch {
            /* missing or undecodable file: the game simply stays silent */
          }
        }),
      ).then(() => undefined);
      for (const outcome of Object.keys(END_SOUND_FILES) as EndOutcome[]) {
        fetch(END_SOUND_FILES[outcome])
          .then((res) => res.arrayBuffer())
          .then((data) => ctx.decodeAudioData(data))
          .then((buffer) => {
            endBuffersRef.current[outcome] = buffer;
          })
          .catch(() => {
            /* missing: the synthesised jingle plays instead */
          });
      }
    }
    return ctx;
  }, []);

  /** Starts the background music (once audio is unlocked by a tap), or restarts it if the browser paused it. */
  const startMusic = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state === "closed" || typeof Audio === "undefined") return;
    // The music is routed through the context: a suspended context plays it silently.
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
    if (!bgmRef.current) {
      try {
        const el = new Audio(BGM_FILE);
        el.loop = true;
        el.preload = "auto";
        const gain = ctx.createGain();
        gain.gain.value = BGM_LEVEL;
        ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
        bgmRef.current = { el, gain };
      } catch {
        return; /* no music on this device */
      }
    }
    if (!bgmRef.current.el.paused) return;
    void bgmRef.current.el.play().catch(() => {
      /* blocked until the next tap */
    });
  }, []);


  /** Unlocks audio from a user gesture (e.g. turning sound back on). */
  const unlock = useCallback(() => {
    ensureContext();
    startMusic();
  }, [ensureContext, startMusic]);

  // Every gesture (tap, swipe, key) keeps audio alive: the browser can suspend the
  // context or pause the music at any time (idle kiosk, hidden tab, audio device
  // change), and only a gesture is sure to be allowed to start it again.
  useEffect(() => {
    if (!enabled) return;
    const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    const onGesture = () => {
      ensureContext();
      startMusic();
    };
    // Back in view: pick up again at once where the browser allows it.
    const onVisible = () => {
      if (document.visibilityState === "visible" && ctxRef.current) startMusic();
    };
    events.forEach((e) => window.addEventListener(e, onGesture, true));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onGesture, true));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, ensureContext, startMusic]);

  const stopAll = useCallback(() => {
    for (const node of activeRef.current) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    activeRef.current.clear();
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAll();
      bgmRef.current?.el.pause();
    }
  }, [enabled, stopAll]);

  useEffect(
    () => () => {
      stopAll();
      // The music element is tied to this context; a new context gets a new one.
      bgmRef.current?.el.pause();
      bgmRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
      loadingRef.current = null;
    },
    [stopAll],
  );

  /** Schedules the roll's sounds on the audio clock, in sync with the animation. */
  const playRoll = useCallback(
    async (plan: { pinsDown: number; totalPins: number; instant?: boolean }) => {
      if (!enabled) return;
      const ctx = ensureContext();
      const master = masterRef.current;
      if (!ctx || !master) return;
      const requestedAt = ctx.currentTime;
      await loadingRef.current;
      // If decoding took a moment, keep the timeline anchored to when the roll began.
      const t0 = requestedAt + 0.03;
      for (const cue of buildSoundCues(plan.pinsDown, plan.totalPins, plan.instant)) {
        const buffer = buffersRef.current[cue.sound];
        if (!buffer) continue;
        const onset = SOUND_ONSETS[cue.sound];
        // Start the file so its onset is heard at t0 + cue.at; if that moment
        // has passed (or is too close), skip into the file instead.
        const startAt = t0 + cue.at - onset;
        const now = ctx.currentTime + 0.01;
        const when = Math.max(now, startAt);
        const offset = Math.max(0, when - startAt);
        if (offset >= buffer.duration) continue;

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        if (cue.loop) {
          src.loop = true;
          src.loopStart = cue.loop[0];
          src.loopEnd = cue.loop[1];
        }
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(cue.gain, when);
        // Bring the quiet rolling up once the set-down thud has passed.
        if (cue.boost) {
          gain.gain.setValueAtTime(cue.gain, Math.max(when, t0 + cue.boost.from));
          gain.gain.linearRampToValueAtTime(cue.boost.gain, Math.max(when + 0.01, t0 + cue.boost.to));
        }
        src.connect(gain).connect(master);
        src.start(when, offset);
        if (cue.fadeFrom !== undefined && cue.fadeTo !== undefined) {
          const from = Math.max(when, t0 + cue.fadeFrom);
          const to = Math.max(from + 0.01, t0 + cue.fadeTo);
          gain.gain.setValueAtTime(cue.boost?.gain ?? cue.gain, from);
          gain.gain.linearRampToValueAtTime(0.0001, to);
          src.stop(to + 0.02);
        }
        activeRef.current.add(src);
        src.onended = () => activeRef.current.delete(src);
      }
    },
    [enabled, ensureContext],
  );

  /** Win (rising chime) or lose ("wah-wah") sound for the end pop-up. */
  const playEnding = useCallback(
    (outcome: EndOutcome) => {
      if (!enabled) return;
      const ctx = ensureContext();
      const master = masterRef.current;
      if (!ctx || !master) return;
      const buffer = endBuffersRef.current[outcome];
      if (!buffer) {
        // Not loaded (yet): the synthesised jingle stands in.
        scheduleEndSound(ctx, master, outcome, ctx.currentTime + 0.03, (node) => {
          activeRef.current.add(node);
          node.onended = () => activeRef.current.delete(node);
        });
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(master);
      src.start(ctx.currentTime + 0.03);
      activeRef.current.add(src);
      src.onended = () => activeRef.current.delete(src);
    },
    [enabled, ensureContext],
  );

  /** Soft chime as the pre-roll question pops up. */
  const playQuestion = useCallback(() => {
    if (!enabled) return;
    const ctx = ensureContext();
    const master = masterRef.current;
    if (!ctx || !master) return;
    scheduleQuestionSound(ctx, master, ctx.currentTime + 0.03, (node) => {
      activeRef.current.add(node);
      node.onended = () => activeRef.current.delete(node);
    });
  }, [enabled, ensureContext]);

  /** A short interface sound (button tap, key, ball pick, pop-up, pinsetter). */
  const playUi = useCallback(
    (name: UiSound) => {
      if (!enabled) return;
      const ctx = ensureContext();
      const master = masterRef.current;
      if (!ctx || !master) return;
      scheduleUiSound(ctx, master, name, ctx.currentTime + 0.01, (node) => {
        activeRef.current.add(node);
        node.onended = () => activeRef.current.delete(node);
      });
    },
    [enabled, ensureContext],
  );

  // Every button tap gets its sound; other components ask for theirs with emitGameSound.
  useEffect(() => {
    if (!enabled) return;
    const onTap = (e: MouseEvent) => {
      const name = soundForTarget(e.target);
      if (name) playUi(name);
    };
    const onRequest = (e: Event) => playUi((e as CustomEvent<UiSound>).detail);
    window.addEventListener("click", onTap, true);
    window.addEventListener(GAME_SOUND_EVENT, onRequest);
    return () => {
      window.removeEventListener("click", onTap, true);
      window.removeEventListener(GAME_SOUND_EVENT, onRequest);
    };
  }, [enabled, playUi]);

  // Music on whenever sound is on (it starts with the first tap: browsers block audio before one).
  useEffect(() => {
    if (enabled && ctxRef.current?.state === "running") startMusic();
  }, [enabled, startMusic]);

  return { unlock, playRoll, playEnding, playQuestion, playUi, stopAll };
}
