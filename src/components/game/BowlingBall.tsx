"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BALL_RADIUS, BALL_START_Z } from "@/lib/laneLayout";
import { aimOffset, ballLineFor, ballPose, STRAIGHT_LINE } from "@/lib/rollAnimation";
import { createBallTexture } from "./sceneAssets";
import { elapsedMs, frameNow, useSceneTimeline } from "./sceneClock";

/** Finger and thumb holes, clustered on the camera-facing upper side. */
const HOLES: { dir: [number, number, number]; r: number }[] = [
  { dir: [-0.24, 0.62, 0.75], r: 0.0135 },
  { dir: [0.24, 0.62, 0.75], r: 0.0135 },
  { dir: [0, 0.4, 0.92], r: 0.016 },
];

interface BowlingBallProps {
  color: string;
  /** Sideways offset from the centre-line (balls waiting beside the lane). */
  offsetX?: number;
  /** A waiting ball: stays at the start position and never rolls. */
  still?: boolean;
  /** A ball resting somewhere fixed (on the ball return). */
  restAt?: readonly [number, number, number];
  /** Tapping the ball picks it (choosing a therapy on the ball return). */
  onSelect?: () => void;
}

export function BowlingBall({ color, offsetX = 0, still = false, restAt, onSelect }: BowlingBallProps) {
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const timeline = useSceneTimeline();

  const texture = useMemo(() => createBallTexture(7), []);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.22,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      }),
    [texture],
  );

  useEffect(() => {
    material.color.set(color);
  }, [material, color]);

  const holes = useMemo(
    () =>
      HOLES.map(({ dir, r }) => {
        const v = new THREE.Vector3(...dir).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
        return { position: v.multiplyScalar(BALL_RADIUS * 1.002), quaternion: q, r };
      }),
    [],
  );

  // The texture is shared (sceneAssets); only this ball's material is its own.
  useEffect(() => () => material.dispose(), [material]);

  // The heading shown, eased toward the line's so the ball never snaps round where its curve meets the rack.
  const heading = useRef(0);

  useFrame((_, delta) => {
    if (restAt) {
      if (group.current) {
        group.current.visible = true;
        group.current.position.set(...restAt);
      }
      return;
    }
    const t = timeline.current;
    const elapsed = still ? 0 : elapsedMs(t, frameNow());
    // Each throw takes its own curved line (fixed by its start time).
    const line = still || t.lineSeed === null ? STRAIGHT_LINE : ballLineFor(t.lineSeed, t.lineDrug, t.lineAim, t.lineLane);
    const pose = ballPose(elapsed, line);
    if (!group.current || !spinner.current) return;
    // The swipe nudges the ball forward; that offset fades out as the roll starts.
    const z = still ? pose.z : pose.z - aimOffset(t.phase, elapsed, t.aim.current);
    group.current.visible = pose.visible;
    group.current.position.set(pose.x + offsetX, pose.y, z);
    // Turn to follow the curve, then roll forward along it.
    const rolling = !still && t.phase === "rolling";
    heading.current = rolling ? heading.current + (pose.heading - heading.current) * (1 - Math.exp(-10 * Math.min(delta, 0.1))) : pose.heading;
    group.current.rotation.y = -heading.current;
    spinner.current.rotation.x = -(BALL_START_Z - z) / BALL_RADIUS;
  });

  return (
    <group ref={group}>
      <group ref={spinner}>
        <mesh
          material={material}
          castShadow
          onClick={
            onSelect
              ? (e) => {
                  e.stopPropagation();
                  onSelect();
                }
              : undefined
          }
          onPointerOver={onSelect ? () => (document.body.style.cursor = "pointer") : undefined}
          onPointerOut={onSelect ? () => (document.body.style.cursor = "") : undefined}
        >
          <sphereGeometry args={[BALL_RADIUS, 64, 48]} />
        </mesh>
        {holes.map((h, i) => (
          <mesh key={i} position={h.position} quaternion={h.quaternion}>
            <circleGeometry args={[h.r, 24]} />
            <meshStandardMaterial color="#0d0d12" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
