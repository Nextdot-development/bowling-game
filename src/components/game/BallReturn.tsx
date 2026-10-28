"use client";

import { BRAND } from "@/lib/brand";
import { BALL_COLORS } from "@/lib/drugVisuals";
import { BALL_RADIUS, RACK_LENGTH, RACK_X, RACK_Z, rackBallPosition } from "@/lib/laneLayout";
import type { DrugId } from "@/types/game";
import { BowlingBall } from "./BowlingBall";

interface BallReturnProps {
  /** The balls waiting on the rack, front to back. */
  balls: readonly DrugId[];
  /** Choosing a therapy: tapping a ball picks it. */
  onSelect?: (drug: DrugId) => void;
}

const RAIL_GAP = BALL_RADIUS * 1.15;

/**
 * The ball return beside the approach, as on a real lane: a hood at the far
 * end, two rails, and the waiting balls resting on them.
 */
export function BallReturn({ balls, onSelect }: BallReturnProps) {
  return (
    <group>
      {/* Base tray */}
      <mesh position={[RACK_X, 0.025, RACK_Z]} receiveShadow castShadow>
        <boxGeometry args={[RAIL_GAP * 2 + 0.12, 0.05, RACK_LENGTH]} />
        <meshStandardMaterial color="#1a2250" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Two chrome rails the balls sit on */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[RACK_X + (side * RAIL_GAP) / 2, 0.075, RACK_Z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, RACK_LENGTH, 12]} />
          <meshStandardMaterial color="#c9cede" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* Hood at the far end, with a dark mouth and a gold trim */}
      <group position={[RACK_X, 0, RACK_Z - RACK_LENGTH / 2 - 0.12]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[RAIL_GAP * 2 + 0.2, 0.4, 0.26]} />
          <meshStandardMaterial color="#141b44" roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.13, 0.131]}>
          <planeGeometry args={[RAIL_GAP * 2 - 0.02, 0.17]} />
          <meshStandardMaterial color="#05070f" roughness={1} />
        </mesh>
        <mesh position={[0, 0.405, 0]}>
          <boxGeometry args={[RAIL_GAP * 2 + 0.22, 0.02, 0.28]} />
          <meshStandardMaterial color={BRAND.gold} emissive={BRAND.gold} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>
      {/* The waiting balls */}
      {balls.map((id, i) => {
        const p = rackBallPosition(i);
        return <BowlingBall key={id} color={BALL_COLORS[id]} restAt={[p.x, BALL_RADIUS + 0.06, p.z]} onSelect={onSelect ? () => onSelect(id) : undefined} />;
      })}
    </group>
  );
}
