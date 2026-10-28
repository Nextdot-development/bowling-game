"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SCENE } from "@/lib/brand";
import { pinPosition } from "@/lib/laneLayout";
import { ballLineFor, lanePinPose, rackLineX } from "@/lib/rollAnimation";
import type { LanePin, Pin } from "@/types/game";
import { elapsedMs, frameNow, useSceneTimeline } from "./sceneClock";

const WHITE = new THREE.Color(SCENE.pinWhite);
const DIMMED = new THREE.Color("#a9afbf");
const tmpAxis = new THREE.Vector3();
const tmpSpin = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

interface PathogenPinProps {
  pin: Pin;
  geometry: THREE.BufferGeometry;
  skin: THREE.Texture;
  /** This pin on the current throw: up, down, shaking, or gone (cleared by an earlier throw). */
  status: LanePin;
  interactive: boolean;
  onSelect: (pin: Pin) => void;
}

export function PathogenPin({
  pin,
  geometry,
  skin,
  status,
  interactive,
  onSelect,
}: PathogenPinProps) {
  const { x, z } = pinPosition(pin.number);
  const body = useRef<THREE.Group>(null);
  const timeline = useSceneTimeline();
  // Keep the latest outcome in a ref so the frame loop never goes stale.
  const statusRef = useRef(status);
  statusRef.current = status;

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: skin,
        color: WHITE.clone(),
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transparent: true,
      }),
    [skin],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const g = body.current;
    if (!g) return;
    const t = timeline.current;
    const pathX = t.lineDrug ? (t.lineSeed === null ? rackLineX(t.lineDrug) : ballLineFor(t.lineSeed, t.lineDrug, t.lineAim, t.lineLane).pocket) : 0;
    const now = frameNow();
    const pose = lanePinPose(pin.number, statusRef.current, t.phase, elapsedMs(t, now), {
      pathX,
      strike: t.strike,
      sweeping: t.sweeping,
      resetSinceMs: t.rackResetAt === null ? null : now - t.rackResetAt,
    });
    g.position.set(pose.dx, pose.lift, pose.dz);
    tmpAxis.set(pose.axisX, 0, pose.axisZ);
    g.quaternion.setFromAxisAngle(tmpAxis, pose.angle);
    // Then the spin of a skidding pin, about the vertical.
    tmpSpin.setFromAxisAngle(UP, pose.yaw);
    g.quaternion.premultiply(tmpSpin);
    g.visible = pose.opacity > 0.01;
    material.opacity = pose.opacity;
    material.depthWrite = pose.opacity > 0.98;
    material.color.lerpColors(WHITE, DIMMED, pose.dim);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect(pin);
  };

  return (
    <group position={[x, 0, z]}>
      <group ref={body}>
        <mesh
          geometry={geometry}
          material={material}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={() => {
            if (interactive) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
        />
      </group>

    </group>
  );
}
