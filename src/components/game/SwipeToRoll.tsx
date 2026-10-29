"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { BALL_RADIUS, BALL_START_Z } from "@/lib/laneLayout";
import { createProjector } from "@/lib/projection";
import type { GamePhase } from "@/types/game";

/** The card at the top of the lane before a roll. */
export interface LanePrompt {
  /** "Hello Dr. …," above the text, if any. */
  greeting?: string;
  eyebrow?: string;
  text: string;
  /** A button on the card that throws the ball (as well as the swipe). */
  action?: string;
}

interface SwipeToRollProps {
  phase: GamePhase;
  /** A ball has been picked. */
  hasBall: boolean;
  width: number;
  height: number;
  aimRef: MutableRefObject<number>;
  onAimingChange: (aiming: boolean) => void;
  /** `aim`: the swipe's direction, -1 (left) to 1 (right). */
  onRoll: (aim?: number) => void;
  prompt?: LanePrompt;
}

/** Fraction of the stage height a full swipe covers. */
const FULL_SWIPE = 0.32;
/**
 * Minimum upward travel (fraction of stage height) to count as a roll. Kept
 * low: large kiosk touch frames often report the touch only once the finger
 * is already moving, so part of the push is never seen.
 */
const MIN_SWIPE = 0.05;
/** A quick flick also counts, even if short (px per ms). */
const FLICK_SPEED = 0.55;
/** The swipe zone covers the lane below this fraction of the stage height. */
const ZONE_TOP = 0.42;
/** Segments on the power gauge. */
const POWER_SEGMENTS = 10;
/** Gap from the ball to the power gauge, as a fraction of the stage width. */
const GAUGE_OFFSET = 0.15;

export function SwipeToRoll({ phase, hasBall, width, height, aimRef, onAimingChange, onRoll }: SwipeToRollProps) {
  const reduce = useReducedMotion();
  // Once the frame's ball is presented on the lane.
  const enabled = phase === "ready" && hasBall;
  /**
   * The swipe in progress. `y` is the lowest point the finger has reached (it
   * starts where the touch was first seen): the push is measured up from
   * there, so a pull back first, or a touch reported late, makes no difference.
   */
  const gesture = useRef<{ id: number; x: number; y: number; lastX: number; lastY: number; samples: { y: number; t: number }[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  /** Where the swipe is heading, -1 (left) to 1 (right), while dragging. */
  const [steer, setSteer] = useState(0);
  const snapBack = useRef(0);
  /** Swipe power, 0 to 1: how far and how fast the finger has gone. Shown on the meter. */
  const [power, setPower] = useState(0);
  /** The power of the last throw, flashed on release. */
  const [shot, setShot] = useState<{ power: number; at: number } | null>(null);
  useEffect(() => {
    if (!shot) return;
    const t = window.setTimeout(() => setShot(null), 1400);
    return () => window.clearTimeout(t);
  }, [shot]);
  const powerFor = (g: { samples: { y: number; t: number }[] }, clientY: number, t: number) => {
    const reach = progressFor(clientY);
    const from = g.samples[0]!;
    const speed = (from.y - clientY) / Math.max(1, t - from.t); // px per ms, recent samples
    return Math.min(1, Math.max(0, reach * 0.6 + Math.min(1, speed / 1.6) * 0.4));
  };

  const ball = useMemo(() => {
    if (!width || !height) return null;
    const project = createProjector(width, height);
    const c = project(0, BALL_RADIUS, BALL_START_Z);
    const top = project(0, BALL_RADIUS * 2, BALL_START_Z);
    // y is relative to the swipe zone, which starts at ZONE_TOP.
    return { x: c.x, y: c.y - height * ZONE_TOP, r: Math.max(24, Math.abs(c.y - top.y)) };
  }, [width, height]);

  const progressFor = (clientY: number) => {
    const g = gesture.current;
    if (!g || !height) return 0;
    return Math.min(1, Math.max(0, (g.y - clientY) / (height * FULL_SWIPE)));
  };

  const end = (rolled: boolean) => {
    gesture.current = null;
    setDragging(false);
    setArmed(false);
    if (rolled) {
      onAimingChange(false);
      return;
    }
    // Ease the ball back to the foul line.
    cancelAnimationFrame(snapBack.current);
    const from = aimRef.current;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 200);
      aimRef.current = from * (1 - k) * (1 - k);
      if (k < 1) snapBack.current = requestAnimationFrame(step);
      else onAimingChange(false);
    };
    snapBack.current = requestAnimationFrame(step);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || gesture.current) return;
    cancelAnimationFrame(snapBack.current);
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep tracking if the finger leaves the lane
    } catch {
      /* not supported */
    }
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, samples: [{ y: e.clientY, t: e.timeStamp }] };
    aimRef.current = 0;
    setPower(0);
    setDragging(true);
    onAimingChange(true);
  };

  /** Lets the ball go if the swipe so far is a throw: far enough up (or a quick flick), and more up than sideways. */
  const release = (clientX: number, clientY: number, t: number): boolean => {
    const g = gesture.current;
    if (!g) return false;
    const dy = g.y - clientY; // upward is positive
    const sideways = clientX - g.x;
    const first = g.samples[0]!;
    const speed = (first.y - clientY) / Math.max(1, t - first.t);
    const upward = dy > Math.abs(sideways) * 0.6;
    const rolled = enabled && upward && (dy >= height * MIN_SWIPE || (speed >= FLICK_SPEED && dy >= 20));
    if (rolled) {
      aimRef.current = Math.max(aimRef.current, 0.15);
      setShot({ power: Math.max(0.15, powerFor(g, clientY, t)), at: t });
      // Straight up is 0; about 30° to either side is full left (-1) or right (1).
      onRoll(Math.max(-1, Math.min(1, Math.atan2(sideways, Math.max(1, dy)) / 0.5)));
    }
    end(rolled);
    return rolled;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    // Pulled back (down the screen): the push is measured from the lowest point.
    if (e.clientY > g.y) {
      g.y = e.clientY;
      g.x = e.clientX;
      g.samples = [];
    }
    g.samples.push({ y: e.clientY, t: e.timeStamp });
    if (g.samples.length > 8) g.samples.shift();
    const p = progressFor(e.clientY);
    // Pushed all the way: the ball goes now, without waiting for the finger to lift
    // (some large touch frames report the lift late, or not at all).
    if (p >= 1 && release(e.clientX, e.clientY, e.timeStamp)) return;
    aimRef.current = p;
    setPower(powerFor(g, e.clientY, e.timeStamp));
    setSteer(Math.max(-1, Math.min(1, Math.atan2(e.clientX - g.x, Math.max(1, g.y - e.clientY)) / 0.5)));
    const nowArmed = g.y - e.clientY >= height * MIN_SWIPE;
    if (nowArmed !== armed) setArmed(nowArmed);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    release(e.clientX, e.clientY, e.timeStamp);
  };

  // A touch screen may cancel a fast swipe as it ends (taking it for a system
  // flick or a scroll): a swipe that was already a throw still rolls the ball.
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    release(g.lastX, g.lastY, e.timeStamp);
  };

  const showHint = enabled && !dragging;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[5] select-none"
      style={{ top: `${ZONE_TOP * 100}%`, touchAction: enabled ? "none" : "auto", cursor: enabled ? (dragging ? "grabbing" : "grab") : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      data-testid="swipe-zone"
    >
      {/* Keyboard / screen reader control sitting on the ball. Pointer clicks
          (detail > 0) are ignored so a tap never rolls; only a swipe does. */}
      {ball && (
        <button
          type="button"
          disabled={!enabled}
          onClick={(e) => {
            if (e.detail === 0 && enabled) onRoll();
          }}
          aria-label="Roll the ball. On the touch screen, swipe the ball up the lane."
          data-sound="none"
          className="absolute rounded-full outline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-gold"
          style={{
            left: ball.x - ball.r * 1.15,
            top: ball.y - ball.r * 1.15,
            width: ball.r * 2.3,
            height: ball.r * 2.3,
          }}
        />
      )}

      {/* Aim guide while dragging: a dotted path up the lane, bending the way the
          finger goes, brighter once the swipe is long enough to throw. */}
      {dragging && ball && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <path
            d={`M ${ball.x} ${ball.y - ball.r * 1.3} Q ${ball.x + steer * width * 0.12} ${ball.y - height * 0.32} ${ball.x + steer * width * 0.03} ${ball.y - height * 0.5}`}
            fill="none"
            stroke={armed ? "rgb(var(--brand-gold-rgb))" : "white"}
            strokeOpacity={armed ? 0.95 : 0.6}
            strokeWidth={Math.max(4, ball.r * 0.22)}
            strokeLinecap="round"
            strokeDasharray={`0.1 ${Math.max(14, ball.r * 0.7)}`}
          />
        </svg>
      )}

      {/* Power meter beside the ball: fills as the swipe gets longer and faster. Kept clear of
          the ball and of the aim guide when the swipe bends right. */}
      {(dragging || shot) && ball && (
        <div
          className="pointer-events-none absolute flex -translate-y-full flex-col items-center gap-1.5"
          style={{ left: ball.x + Math.max(ball.r * 2.4, width * GAUGE_OFFSET), top: ball.y + ball.r }}
          aria-hidden
        >
          {(() => {
            const level = shot ? shot.power : power;
            const lit = Math.round(level * POWER_SEGMENTS);
            return (
              <div className={`power-gauge ${shot ? "power-gauge-fired" : ""} ${lit === POWER_SEGMENTS ? "power-gauge-max" : ""}`}>
                <span className="power-gauge-value">{lit === POWER_SEGMENTS ? "MAX" : `${Math.round(level * 100)}%`}</span>
                <div className="power-gauge-tube" style={{ height: Math.max(110, height * 0.32) }}>
                  {Array.from({ length: POWER_SEGMENTS }, (_, i) => POWER_SEGMENTS - 1 - i).map((i) => (
                    <span key={i} className={`power-gauge-seg ${i < lit ? "is-lit" : ""} ${i >= POWER_SEGMENTS - 3 ? "is-hot" : ""}`} />
                  ))}
                </div>
                <span className="power-gauge-label">Power</span>
              </div>
            );
          })()}
        </div>
      )}
      <AnimatePresence>
        {shot && ball && (
          <motion.p
            key={shot.at}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap font-display text-3xl uppercase text-brand-gold [-webkit-text-stroke:0.06em_rgb(var(--brand-navy-rgb))] [paint-order:stroke_fill] [text-shadow:0_3px_0_rgb(0_0_0/0.5)] kiosk:text-[min(3rem,5vh)]"
            style={{ left: ball.x, top: ball.y - ball.r * 3 }}
            initial={reduce ? false : { scale: 0.3, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 420, damping: 14 }}
            aria-hidden
          >
            Power {Math.round(shot.power * 100)}%
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHint && ball && (
          <motion.div
            key="hint"
            className="pointer-events-none absolute flex flex-col items-center"
            style={{ left: ball.x, top: ball.y - ball.r * 1.4, translateX: "-50%", translateY: "-100%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="-my-2 block text-white drop-shadow"
                animate={reduce ? undefined : { y: [6, -6], opacity: [0.2, 1, 0.2] }}
                transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, delay: (2 - i) * 0.18 }}
              >
                <ChevronUp className="h-9 w-9" strokeWidth={3} />
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
