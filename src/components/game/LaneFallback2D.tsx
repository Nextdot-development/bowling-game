"use client";

import { useEffect, useMemo, useRef } from "react";
import { CONVENTIONAL_BALLS, DRUGS, PINS } from "@/data/gameData";
import { SCENE } from "@/lib/brand";
import { BALL_COLORS, ballColor } from "@/lib/drugVisuals";
import {
  ARROWS_Z,
  BALL_RADIUS,
  BALL_START_Z,
  introBallX,
  DECK_END_Z,
  FOUL_LINE_Z,
  GUTTER_WIDTH,
  LANE_HALF_WIDTH,
  LANE_NEAR_Z,
  PIN_HEIGHT,
  PIN_MAX_RADIUS,
  PIN_PROFILE,
  pinPosition,
} from "@/lib/laneLayout";
import { createProjector, type Projector } from "@/lib/projection";
import { ballLineFor, ballPose, lanePinPose, STRAIGHT_LINE, throwPath } from "@/lib/rollAnimation";
import { useElementSize } from "@/hooks/useElementSize";
import type { BowlingSceneProps } from "./BowlingScene";

/** SVG path for a pin of pixel height h, base at (0,0), growing upwards. */
function pinPath(h: number): string {
  const w = (PIN_MAX_RADIUS / PIN_HEIGHT) * h;
  const right = PIN_PROFILE.map(([t, r]) => `${(r * w).toFixed(2)},${(-t * h).toFixed(2)}`);
  const left = [...PIN_PROFILE].reverse().map(([t, r]) => `${(-r * w).toFixed(2)},${(-t * h).toFixed(2)}`);
  return `M${right.join(" L")} L${left.join(" L")} Z`;
}

function quad(p: Projector, x0: number, x1: number, zNear: number, zFar: number, y = 0) {
  return [p(x0, y, zNear), p(x1, y, zNear), p(x1, y, zFar), p(x0, y, zFar)]
    .map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`)
    .join(" ");
}

/** Unit-radius ball with finger holes, centred on the origin. */
function BallGlyph({ gradientId }: { gradientId: string }) {
  return (
    <>
      <circle r="1" fill={`url(#${gradientId})`} />
      <circle cx="-0.25" cy="-0.45" r="0.1" fill="#111" />
      <circle cx="0.25" cy="-0.45" r="0.1" fill="#111" />
      <circle cx="0" cy="-0.15" r="0.12" fill="#111" />
    </>
  );
}

type FallbackProps = Pick<BowlingSceneProps, "phase" | "ballDrug" | "lane" | "rollStartedAt" | "lineSeed" | "lineAim" | "lineDrug" | "rackResetAt">;

export function LaneFallback2D({
  phase,
  ballDrug,
  lane,
  rollStartedAt,
  lineSeed,
  lineAim = null,
  lineDrug,
  rackResetAt = null,
}: FallbackProps) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const ballRef = useRef<SVGGElement>(null);
  const pinRefs = useRef<(SVGGElement | null)[]>([]);

  const project = useMemo(() => (width && height ? createProjector(width, height) : null), [width, height]);

  const falls = (n: (typeof PINS)[number]["number"]) => lane[n] === "down" || lane[n] === "gone";

  // Frame loop: writes SVG attributes directly, no React renders per frame.
  useEffect(() => {
    if (!project) return;
    let raf = 0;
    const draw = () => {
      const elapsed =
        phase === "result" || phase === "transition" || phase === "scorecard" || phase === "closing"
          ? Number.POSITIVE_INFINITY
          : phase === "rolling" && rollStartedAt !== null
            ? performance.now() - rollStartedAt
            : 0;

      const line = lineSeed === null ? STRAIGHT_LINE : ballLineFor(lineSeed, lineDrug, lineAim, lane);
      const b = ballPose(elapsed, line);
      const path = throwPath(lineSeed, lineDrug, lineAim, lane);
      const bc = project(b.x, b.y, b.z);
      const br = Math.abs(project(b.x, b.y + BALL_RADIUS, b.z).y - bc.y);
      if (ballRef.current) {
        ballRef.current.setAttribute("transform", `translate(${bc.x} ${bc.y}) scale(${br})`);
        ballRef.current.style.opacity = ballDrug && b.visible && b.y > -0.05 ? "1" : "0";
      }

      PINS.forEach((pin, i) => {
        const g = pinRefs.current[i];
        if (!g) return;
        const { x, z } = pinPosition(pin.number);
        const now = performance.now();
        const pose = lanePinPose(pin.number, lane[pin.number], phase, elapsed, {
          path,
          lane,
          strike: Object.values(lane).every((s) => s === "down"),
          sweeping: false,
          resetSinceMs: rackResetAt === null ? null : now - rackResetAt,
        });
        const base = project(x + pose.dx, 0, z + pose.dz);
        // The way it is tipping (axis = up × direction).
        const dir = { x: -pose.axisZ, z: pose.axisX };
        const rot = (pose.angle * 180) / Math.PI * (pose.dim > 0 || !falls(pin.number) ? 1 : dir.x);
        const squash = 1 - 0.7 * Math.sin(pose.angle) * Math.abs(dir.z) * (falls(pin.number) ? 1 : 0);
        g.setAttribute("transform", `translate(${base.x} ${base.y}) rotate(${rot.toFixed(2)}) scale(1 ${squash.toFixed(3)})`);
        // Down, or cleared by an earlier throw: gone from the lane.
        g.style.opacity = String(pose.opacity);
        g.style.filter = pose.dim > 0 ? `grayscale(1) brightness(${1 - 0.22 * pose.dim})` : "";
      });

      if (phase === "rolling" || phase === "transition") raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, phase, rollStartedAt, lineSeed, lineAim, lineDrug, lane, ballDrug, rackResetAt]);

  const color = ballColor(ballDrug);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" data-testid="lane-2d">
      {project && (
        <svg width={width} height={height} className="absolute inset-0" aria-hidden>
          <defs>
            <linearGradient id="wood2d" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#d9a466" />
              <stop offset="0.6" stopColor="#e8c08a" />
              <stop offset="1" stopColor="#f5dfba" />
            </linearGradient>
            {[
              ["ball2d", color],
              ...(Object.keys(DRUGS) as (keyof typeof DRUGS)[]).map((id) => [`ball2d-${id}`, BALL_COLORS[id]]),
            ].map(([id, fill]) => (
              <radialGradient key={id} id={id} cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                <stop offset="0.35" stopColor={fill} stopOpacity="1" />
                <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
              </radialGradient>
            ))}
          </defs>
          <polygon
            points={quad(project, -LANE_HALF_WIDTH - GUTTER_WIDTH - 0.3, LANE_HALF_WIDTH + GUTTER_WIDTH + 0.3, LANE_NEAR_Z, DECK_END_Z)}
            fill={SCENE.gutter}
          />
          <polygon points={quad(project, -LANE_HALF_WIDTH, LANE_HALF_WIDTH, LANE_NEAR_Z, DECK_END_Z)} fill="url(#wood2d)" />
          {Array.from({ length: 13 }, (_, i) => {
            const x = -LANE_HALF_WIDTH + (i + 1) * ((LANE_HALF_WIDTH * 2) / 14);
            const a = project(x, 0, LANE_NEAR_Z);
            const b = project(x, 0, DECK_END_Z);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a8743f" strokeOpacity="0.35" strokeWidth="1" />;
          })}
          <polygon points={quad(project, -LANE_HALF_WIDTH, LANE_HALF_WIDTH, FOUL_LINE_Z + 0.01, FOUL_LINE_Z - 0.01)} fill="#5a3a1c" />
          {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
            const z = ARROWS_Z - Math.abs(i) * 0.16;
            const tip = project(i * 0.205, 0, z - 0.07);
            const l = project(i * 0.205 - 0.028, 0, z + 0.05);
            const r = project(i * 0.205 + 0.028, 0, z + 0.05);
            return <polygon key={i} points={`${tip.x},${tip.y} ${l.x},${l.y} ${r.x},${r.y}`} fill="#86552a" />;
          })}

          {/* Farthest pins first so nearer ones overlap them. */}
          {[...PINS]
            .map((pin, i) => ({ pin, i }))
            .sort((a, b) => pinPosition(a.pin.number).z - pinPosition(b.pin.number).z)
            .map(({ pin, i }) => {
              const { x, z } = pinPosition(pin.number);
              const base = project(x, 0, z);
              const h = base.y - project(x, PIN_HEIGHT, z).y;
              return (
                <g key={pin.number}>
                  <g
                    ref={(el) => {
                      pinRefs.current[i] = el;
                    }}
                    transform={`translate(${base.x} ${base.y})`}
                  >
                    <path d={pinPath(h)} fill={SCENE.pinWhite} stroke="#b9bccb" strokeWidth="0.8" />
                    <rect x={-h * 0.08} y={-h * 0.675} width={h * 0.16} height={h * 0.02} fill={SCENE.pinStripe} />
                    <rect x={-h * 0.08} y={-h * 0.71} width={h * 0.16} height={h * 0.02} fill={SCENE.pinStripe} />
                  </g>
                </g>
              );
            })}

          <g ref={ballRef}>
            <BallGlyph gradientId="ball2d" />
          </g>

          {phase === "intro" &&
            CONVENTIONAL_BALLS.map((id, i) => {
              const x = introBallX(i, CONVENTIONAL_BALLS.length);
              const c = project(x, BALL_RADIUS, BALL_START_Z);
              const r = Math.abs(project(x, BALL_RADIUS * 2, BALL_START_Z).y - c.y);
              return (
                <g key={id} transform={`translate(${c.x} ${c.y}) scale(${r})`}>
                  <BallGlyph gradientId={`ball2d-${id}`} />
                </g>
              );
            })}
        </svg>
      )}

    </div>
  );
}
