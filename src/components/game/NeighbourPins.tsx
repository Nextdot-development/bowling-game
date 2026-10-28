"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PINS } from "@/data/gameData";
import { SCENE } from "@/lib/brand";
import { NEIGHBOUR_LANE_SPACING, pinPosition } from "@/lib/laneLayout";
import { createPinGeometry, createPinTexture } from "./sceneAssets";

/** The lanes either side of the doctor's lane (BowlingLane draws them). */
const LANES = [-3, -2, -1, 1, 2, 3] as const;

/**
 * Scenery: a full rack of plain pins standing in each neighbouring lane, so
 * the arena looks like a working bowling alley. One instanced mesh for all of
 * them; they never move and play no part in the game.
 */
export function NeighbourPins() {
  const geometry = useMemo(() => createPinGeometry(), []);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ map: createPinTexture(), color: SCENE.pinWhite, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
    [],
  );
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, LANES.length * PINS.length);
    const at = new THREE.Matrix4();
    let i = 0;
    for (const lane of LANES)
      for (const { number } of PINS) {
        const { x, z } = pinPosition(number);
        m.setMatrixAt(i++, at.makeTranslation(lane * NEIGHBOUR_LANE_SPACING + x, 0, z));
      }
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [geometry, material]);

  useEffect(
    () => () => {
      // The pin shape and its skin are shared (sceneAssets); the material is ours.
      material.dispose();
    },
    [geometry, material],
  );

  return <primitive object={mesh} />;
}
