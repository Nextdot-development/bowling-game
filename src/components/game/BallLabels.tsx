"use client";

import { Fragment } from "react";
import { CONVENTIONAL_BALLS, DRUGS } from "@/data/gameData";
import { BALL_RADIUS, BALL_START_Z, introBallX, rackBallPosition } from "@/lib/laneLayout";
import type { DrugId } from "@/types/game";
import { BALL_COLORS } from "@/lib/drugVisuals";
import { createProjector } from "@/lib/projection";
import { opening } from "@/lib/timing";

/** Name tags under the balls lined up on the intro lane. */
export function BallLabels({ width, height }: { width: number; height: number }) {
  if (!width || !height) return null;
  const project = createProjector(width, height);
  // Tags never wider than the gap between neighbouring balls.
  const gap = Math.abs(project(introBallX(1, 2), 0, BALL_START_Z).x - project(introBallX(0, 2), 0, BALL_START_Z).x);

  return (
    <ul className={`${opening.played ? "" : "intro-late"} pointer-events-none absolute inset-0 z-10`} aria-label="The balls">
      {CONVENTIONAL_BALLS.map((id, i) => {
        // Above the ball, so the tag never runs off the bottom of the lane.
        const at = project(introBallX(i, CONVENTIONAL_BALLS.length), BALL_RADIUS * 2 + 0.05, BALL_START_Z);
        return (
          <li
            key={id}
            className="absolute -translate-x-1/2 -translate-y-full rounded-xl bg-black/45 px-3 py-1.5 text-center leading-tight backdrop-blur-sm sm:px-4 sm:py-2 short:px-2 short:py-1"
            style={{ left: at.x, top: at.y, maxWidth: Math.max(96, gap - 10) }}
          >
            <span className="block text-balance font-display text-sm font-bold text-white sm:text-lg short:text-xs kiosk:text-xl">{DRUGS[id].name}</span>
            <span className="hidden text-balance text-xs text-white/75 sm:block sm:text-sm short:hidden kiosk:text-base">{DRUGS[id].drugClass}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The balls on the ball return while the doctor chooses a therapy: each one
 * glows with a pulsing gold ring and carries its name tag, and a tap on the
 * ball or its tag picks it. (A hidden list beside the lane is the accessible way to choose.)
 */
export function RackLabels({ balls, width, height, onSelect }: { balls: readonly DrugId[]; width: number; height: number; onSelect: (drug: DrugId) => void }) {
  if (!width || !height) return null;
  const project = createProjector(width, height);
  const spots = balls.map((id, i) => {
    const p = rackBallPosition(i);
    const ball = project(p.x, BALL_RADIUS + 0.06, p.z);
    const r = project(p.x + BALL_RADIUS, BALL_RADIUS + 0.06, p.z).x - ball.x;
    return { id, ball, r };
  });
  // On a narrow lane there is no room for the list; there the ball cards below the lane name the balls.
  const list = width >= 560 && spots.length > 0;
  // The list sits just right of the rack, level with the balls.
  const right = Math.max(...spots.map((s) => s.ball.x + s.r * 1.5));
  const middle = spots.reduce((sum, s) => sum + s.ball.y, 0) / Math.max(1, spots.length);
  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-sound="select" aria-hidden>
      {spots.map(({ id, ball, r }) => {
        // A round tap target over the ball itself (above the swipe area, which covers the lane's foot),
        // never reaching over the next ball's (on a small phone the balls sit close together).
        const nearest = Math.min(...spots.filter((s) => s.id !== id).map((s) => Math.hypot(s.ball.x - ball.x, s.ball.y - ball.y)));
        const hit = Math.min(Math.max(44, r * 2.6), nearest);
        return (
          <Fragment key={id}>
            <span className="rack-ball-glow absolute rounded-full" style={{ left: ball.x - r * 1.15, top: ball.y - r * 1.15, width: r * 2.3, height: r * 2.3 }} />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onSelect(id)}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
              style={{ left: ball.x, top: ball.y, width: hit, height: hit }}
            />
          </Fragment>
        );
      })}
      {list && (
        // Centred on the balls by layout, not a transform, so the text lands on whole pixels and stays sharp.
        <div className="absolute flex h-0 items-center" style={{ left: Math.round(right), top: Math.round(middle) }}>
          <div className="solid-panel pointer-events-auto rounded-2xl p-2.5 shadow-lift ring-2 ring-brand-gold kiosk:p-[0.75rem]">
            <p className="eyebrow px-1.5 pb-1.5 text-brand-gold kiosk:pb-[0.5rem] kiosk:text-[0.95rem]">Choose your ball</p>
            <div className="flex flex-col gap-2 kiosk:gap-[0.6rem]">
              {spots.map(({ id }) => (
                <button
                  key={id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => onSelect(id)}
                  className="flex items-center gap-2.5 whitespace-nowrap rounded-xl bg-white px-3.5 py-2.5 text-left text-base font-bold text-brand-navy shadow-md transition-colors hover:bg-brand-gold active:scale-[0.98] kiosk:gap-[0.75rem] kiosk:px-[1rem] kiosk:py-[0.7rem] kiosk:text-[1.25rem]"
                >
                  <span className="h-4 w-4 shrink-0 rounded-full ring-2 ring-brand-navy/30 kiosk:h-[1.2rem] kiosk:w-[1.2rem]" style={{ background: BALL_COLORS[id] }} />
                  {DRUGS[id].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
