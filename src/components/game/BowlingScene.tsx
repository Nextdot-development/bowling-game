"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useContext, useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { CONVENTIONAL_BALLS } from "@/data/gameData";
import { CAMERA, FRONT_ROW_Z, introBallX, verticalFovFor } from "@/lib/laneLayout";
import { chaseShot, FULL_FRAME, type FrameBounds } from "@/lib/cameraRig";
import { ballLineFor, STRAIGHT_LINE } from "@/lib/rollAnimation";
import { BALL_COLORS } from "@/lib/drugVisuals";
import type { DrugId, GamePhase, LanePins, Pin } from "@/types/game";
import { BowlingBall } from "./BowlingBall";
import { BallReturn } from "./BallReturn";
import { BowlingLane } from "./BowlingLane";
import { NeighbourPins } from "./NeighbourPins";
import { PinDeck } from "./PinDeck";
import { PinSetter } from "./PinSetter";
import { elapsedMs, frameNow, SceneTimelineContext, type SceneTimeline } from "./sceneClock";
import { BALL_TRAVEL_MS, INTRO_FLY_MS, opening } from "@/lib/timing";

export interface BowlingSceneProps {
  phase: GamePhase;
  /** Selected drug: sets the ball colour. */
  ballDrug: DrugId | null;
  /** Every pin's state for this throw (up, down or wobble). */
  lane: LanePins;
  rollStartedAt: number | null;
  /** Fixes the ball's curved line (shared by both throws of a session). */
  lineSeed: number | null;
  /** The swipe's direction for this throw (null: none). */
  lineAim?: number | null;
  /** The first throw's ball: fixes the line through the rack (shared by both throws). */
  lineDrug: DrugId | null;
  /** When the transition's rack reset started, if it has. */
  rackResetAt?: number | null;
  interactive: boolean;
  onPinSelect: (pin: Pin) => void;
  onContextLost?: () => void;
  /** Called once the WebGL renderer is up. */
  onReady?: () => void;
  /** Swipe progress 0..1, written by the swipe overlay. */
  aimRef: MutableRefObject<number>;
  /** True while the player is dragging the ball (renders every frame). */
  aiming: boolean;
  /** Balls waiting on the ball return beside the lane. */
  rackBalls?: readonly DrugId[];
  /** Choosing a therapy: tapping a ball on the return picks it. */
  onRackSelect?: (drug: DrugId) => void;
}

const smooth01 = (v: number) => {
  const k = Math.min(1, Math.max(0, v));
  return k * k * (3 - 2 * k);
};
const restPos = new THREE.Vector3(...CAMERA.position);
const restLook = new THREE.Vector3(...CAMERA.target);
/** Opening shot: low and close to the pins, before the camera sweeps back to the bowler's view. */
const introPos = new THREE.Vector3(0.9, 0.45, FRONT_ROW_Z + 2.4);
const introLook = new THREE.Vector3(0, 0.3, FRONT_ROW_Z - 1);
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();

/**
 * The camera. At rest (choosing, aiming, results) it holds its fixed framing,
 * which the pin tags and the swipe control are drawn for. While the ball
 * rolls it drops in low behind the ball and chases it down the lane, ending in
 * a close-up of the pin deck, with a jolt as the ball smashes in.
 */
/**
 * The part of the canvas, left to right (-1 to 1), not covered by a panel
 * marked data-lane-cover across the lower part of the stage, where the ball rolls.
 */
function visibleStrip(canvas: HTMLCanvasElement): FrameBounds {
  const c = canvas.getBoundingClientRect();
  if (c.width < 1) return FULL_FRAME;
  const bandTop = c.top + c.height * 0.4;
  const bounds = { ...FULL_FRAME };
  for (const el of document.querySelectorAll<HTMLElement>("[data-lane-cover]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.bottom <= bandTop || r.top >= c.bottom || r.right <= c.left || r.left >= c.right) continue;
    const toNdc = (px: number) => ((px - c.left) / c.width) * 2 - 1;
    if (r.left + r.width / 2 > c.left + c.width / 2) bounds.right = Math.min(bounds.right, toNdc(r.left));
    else bounds.left = Math.max(bounds.left, toNdc(r.right));
  }
  return bounds;
}

function CameraRig({ hits, strike }: { hits: boolean; strike: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const canvas = useThree((s) => s.gl.domElement);
  // Measured once as each roll starts (a layout read every frame would cost smoothness).
  const strip = useRef<{ roll: number | null; bounds: FrameBounds }>({ roll: null, bounds: FULL_FRAME });
  const timeline = useContext(SceneTimelineContext);
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Opening sweep progress: keeps pace with real time, but one very slow frame (the first) never skips it.
  const introMs = useRef(0);
  useEffect(() => {
    camera.fov = verticalFovFor(size.width / Math.max(size.height, 1));
    camera.near = 0.05;
    camera.far = 40;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    const t = timeline?.current;
    camPos.copy(restPos);
    camLook.copy(restLook);
    // The opening: a sweep back from the pins to the bowler's view, arcing in from the side.
    if (t && t.phase === "intro" && !reduce && !opening.played) {
      introMs.current += Math.min(delta, 0.1) * 1000;
      if (introMs.current >= INTRO_FLY_MS) opening.played = true;
      const k = smooth01(introMs.current / INTRO_FLY_MS);
      camPos.lerpVectors(introPos, restPos, k);
      camPos.x = introPos.x * (1 - k) * (1 - k);
      camLook.lerpVectors(introLook, restLook, k);
    }
    if (t && t.phase === "rolling" && !reduce) {
      const ms = elapsedMs(t, frameNow());
      const line = t.lineSeed === null ? STRAIGHT_LINE : ballLineFor(t.lineSeed, t.lineDrug, t.lineAim, t.lineLane);
      if (strip.current.roll !== t.rollStartedAt) strip.current = { roll: t.rollStartedAt, bounds: visibleStrip(canvas) };
      // Low behind the ball, chasing it down the lane; it never lets the ball leave the visible part of the frame (cameraRig).
      const shot = chaseShot(ms, line, camera.fov, camera.aspect, strip.current.bounds);
      camPos.set(...shot.pos);
      camLook.set(...shot.look);
      const since = ms - BALL_TRAVEL_MS;
      if (hits && since > 0 && since < 420) {
        const amp = (strike ? 0.025 : 0.01) * Math.exp(-since / 140);
        camPos.x += amp * Math.sin(since * 0.21);
        camPos.y += amp * Math.sin(since * 0.33 + 1.3);
      }
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  });
  return null;
}

/** Most pixels the scene renders (about 1080p plus a little): a 4K or scaled-up 42" panel gets no more, so the roll stays smooth. */
const MAX_PIXELS = 2.6e6;
/** Resolution steps tried, from full down, when the roll can't hold its frame rate. */
const QUALITY = [1, 0.85, 0.7] as const;

/**
 * Sets the render resolution: the screen's pixel ratio (at most 1.5), within the
 * pixel budget. If a roll still drops frames, it steps the resolution down for
 * the rest of the session (measured only while rolling: other phases render on
 * demand), applied once the roll is over, since resizing mid-roll is itself a hitch.
 */
function ResolutionGovernor({ phase }: { phase: GamePhase }) {
  const size = useThree((s) => s.size);
  const setDpr = useThree((s) => s.setDpr);
  const timeline = useContext(SceneTimelineContext);
  const [step, setStep] = useState(0);
  const pending = useRef(0);
  const sample = useRef({ frames: 0, time: 0 });

  useEffect(() => {
    if (phase !== "rolling" && pending.current > step) setStep(pending.current);
  }, [phase, step]);

  useEffect(() => {
    const device = Math.min(window.devicePixelRatio || 1, 1.5);
    const budget = Math.sqrt(MAX_PIXELS / Math.max(1, size.width * size.height));
    setDpr(Math.max(0.6, Math.min(device, budget) * (QUALITY[step] ?? 1)));
  }, [size.width, size.height, step, setDpr]);

  useFrame((_, delta) => {
    const s = sample.current;
    if (timeline?.current.phase !== "rolling" || pending.current >= QUALITY.length - 1) {
      s.frames = 0;
      s.time = 0;
      return;
    }
    // Skip the odd long frame (a tab switch); judge the steady rate over a second.
    if (delta > 0.25) return;
    s.frames += 1;
    s.time += delta;
    if (s.time >= 1) {
      if (s.frames / s.time < 45) pending.current = Math.min(QUALITY.length - 1, pending.current + 1);
      s.frames = 0;
      s.time = 0;
    }
  });
  return null;
}

/**
 * Compiles every material's shaders up front (and again when the ball changes),
 * so nothing compiles on the first frames of a roll: that compile is a visible hitch.
 */
function Precompile({ deps }: { deps: unknown[] }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const id = requestAnimationFrame(() => gl.compile(scene, camera));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, ...deps]);
  return null;
}

/** Renders a fresh frame whenever the game state changes in demand mode. */
function Invalidator({ deps }: { deps: unknown[] }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}

function ContextLossWatcher({ onLost }: { onLost?: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!onLost) return;
    const el = gl.domElement;
    const handler = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", handler);
    return () => el.removeEventListener("webglcontextlost", handler);
  }, [gl, onLost]);
  return null;
}

function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const targets: THREE.Object3D[] = [];
    if (key.current) {
      key.current.target.position.set(0, 0, -5);
      targets.push(key.current.target);
    }
    if (spot.current) {
      spot.current.target.position.set(0, 0, FRONT_ROW_Z - 0.2);
      targets.push(spot.current.target);
    }
    targets.forEach((t) => scene.add(t));
    return () => targets.forEach((t) => scene.remove(t));
  }, [scene]);

  return (
    <>
      <hemisphereLight args={["#dde4ff", "#5b4026", 0.55]} />
      {/* Soft fill from behind the camera so ball colours read true. */}
      <pointLight position={[0.5, 1.1, 2.3]} intensity={2.2} decay={1.2} />
      <directionalLight
        ref={key}
        position={[1.2, 5, 1.8]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={26}
      />
      <spotLight
        ref={spot}
        position={[0, 2.3, FRONT_ROW_Z + 0.9]}
        angle={0.72}
        penumbra={0.9}
        intensity={9}
        decay={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
      />
      <Environment resolution={256} frames={1} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2.4} position={[0, 5, -4]} rotation-x={Math.PI / 2} scale={[3, 12, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-4, 2, -3]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[4, 2, -3]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 2, 4]} scale={2} />
      </Environment>
    </>
  );
}

export default function BowlingScene(props: BowlingSceneProps) {
  const { phase, ballDrug, lane, rollStartedAt, lineSeed, lineAim = null, lineDrug, rackResetAt = null, interactive, onPinSelect, onContextLost, onReady, aimRef, aiming, rackBalls = [], onRackSelect } =
    props;

  // The second throw is at the rack exactly as the first left it: no sweep (client request).
  const sweeping = false;
  const strike = Object.values(lane).every((s) => s === "down");
  const timeline = useRef<SceneTimeline>({ phase, rollStartedAt, lineSeed, lineAim, lineDrug, lineLane: lane, rackResetAt, sweeping, strike, aim: aimRef });
  timeline.current = { phase, rollStartedAt, lineSeed, lineAim, lineDrug, lineLane: lane, rackResetAt, sweeping, strike, aim: aimRef };

  return (
    <SceneTimelineContext.Provider value={timeline}>
      <Canvas
        shadows="soft"
        // Set by ResolutionGovernor: capped so the roll stays smooth on a 4K or scaled-up kiosk panel.
        dpr={1}
        frameloop={phase === "rolling" || phase === "transition" || aiming || (phase === "intro" && !opening.played) ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [...CAMERA.position], fov: 30 }}
        className="!absolute inset-0"
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          onReady?.();
        }}
      >
        <ResolutionGovernor phase={phase} />
        <Precompile deps={[ballDrug, phase === "intro"]} />
        <CameraRig hits={Object.values(lane).includes("down")} strike={strike} />
        <Invalidator deps={[phase, ballDrug, lane, rollStartedAt, aiming, rackBalls.join()]} />
        <ContextLossWatcher onLost={onContextLost} />
        <Lights />
        <BowlingLane />
        <NeighbourPins />
        <PinDeck
          lane={lane}
          interactive={interactive}
          onPinSelect={onPinSelect}
        />
        <PinSetter />
        {phase !== "intro" && <BallReturn balls={rackBalls} onSelect={onRackSelect} />}
        {/* Intro: Player 1's two balls line up. In play, only the ball being rolled is on the lane. */}
        {phase === "intro"
          ? CONVENTIONAL_BALLS.map((id, i) => <BowlingBall key={id} color={BALL_COLORS[id]} offsetX={introBallX(i, CONVENTIONAL_BALLS.length)} still />)
          : ballDrug && <BowlingBall color={BALL_COLORS[ballDrug]} />}
      </Canvas>
    </SceneTimelineContext.Provider>
  );
}
