"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { GUTTER_WIDTH, LANE_HALF_WIDTH, PIN_HEIGHT, PIN_SPACING, pinPosition } from "@/lib/laneLayout";
import { BAR_HEIGHT, freshRackLift, SETTER, sweepBar, tableLift } from "@/lib/rollAnimation";
import { elapsedMs, frameNow, useSceneTimeline } from "./sceneClock";

const BAR_WIDTH = (LANE_HALF_WIDTH + GUTTER_WIDTH) * 2 - 0.08;
const TABLE_THICKNESS = 0.08;
const TABLE_FRONT_Z = pinPosition(1).z + PIN_SPACING / 2;
const TABLE_BACK_Z = pinPosition(7).z - PIN_SPACING / 2;
const TABLE_WIDTH = Math.abs(pinPosition(7).x) * 2 + PIN_SPACING;

export function PinSetter() {
  const timeline = useSceneTimeline();
  const bar = useRef<THREE.Mesh>(null);
  const table = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = timeline.current;
    const now = frameNow();
    let s = Number.NaN;
    let mode: "second" | "reset" | null = null;
    if (t.phase === "rolling" && t.sweeping) {
      s = elapsedMs(t, now) / 1000;
      mode = "second";
    } else if (t.phase === "transition" && t.rackResetAt !== null) {
      s = (now - t.rackResetAt) / 1000;
      mode = "reset";
    }
    const b = mode ? sweepBar(s) : null;
    if (bar.current) {
      bar.current.visible = b !== null;
      if (b) bar.current.position.set(0, b.y + BAR_HEIGHT / 2, b.z);
    }
    let tableY: number | null = null;
    if (mode === "second" && s >= 0 && s <= SETTER.setDown + 0.3) {
      // Comes down onto the standing pins, lifts them, sets them back and goes up.
      const lowered = Math.min(1, s / 0.15) * (1 - Math.min(1, Math.max(0, (s - SETTER.setDown) / 0.3)));
      tableY = PIN_HEIGHT + tableLift(s) + (1 - lowered) * 1.2;
    } else if (mode === "reset") {
      const fresh = freshRackLift(s);
      if (fresh !== null && s <= SETTER.tableUp) tableY = PIN_HEIGHT + fresh + Math.max(0, (s - SETTER.rackSet) / (SETTER.tableUp - SETTER.rackSet)) * 1.2;
    }
    if (table.current) {
      table.current.visible = tableY !== null;
      if (tableY !== null) table.current.position.set(0, tableY + TABLE_THICKNESS / 2, (TABLE_FRONT_Z + TABLE_BACK_Z) / 2);
    }
  });

  return (
    <group>
      <mesh ref={bar} visible={false} castShadow>
        <boxGeometry args={[BAR_WIDTH, BAR_HEIGHT, 0.05]} />
        <meshStandardMaterial color="#3a4468" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh ref={table} visible={false} castShadow>
        <boxGeometry args={[TABLE_WIDTH, TABLE_THICKNESS, TABLE_FRONT_Z - TABLE_BACK_Z]} />
        <meshStandardMaterial color="#2a3150" metalness={0.5} roughness={0.45} />
      </mesh>
    </group>
  );
}
