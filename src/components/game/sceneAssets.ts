import * as THREE from "three";
import { SCENE } from "@/lib/brand";
import { PIN_HEIGHT, PIN_MAX_RADIUS, PIN_PROFILE } from "@/lib/laneLayout";

/** Deterministic PRNG so the lane looks identical on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

/** Maple lane boards with grain, running along the lane (canvas y axis). */
function drawWoodTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 2048;
  const { c, ctx } = canvas(W, H);
  const rand = mulberry32(39);
  const boards = 26;
  const bw = W / boards;

  for (let b = 0; b < boards; b++) {
    const x0 = b * bw;
    const hue = 29 + rand() * 6;
    const light = 60 + rand() * 9;
    const sat = 58 + rand() * 14;
    ctx.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;
    ctx.fillRect(x0, 0, bw + 1, H);

    // Long grain streaks.
    for (let g = 0; g < 14; g++) {
      const gx = x0 + rand() * bw;
      const amp = 0.6 + rand() * 1.6;
      const freq = 0.002 + rand() * 0.006;
      const phase = rand() * Math.PI * 2;
      ctx.strokeStyle = `hsla(${hue - 4} ${sat + 8}% ${light - 18 - rand() * 12}% / ${0.12 + rand() * 0.2})`;
      ctx.lineWidth = 0.6 + rand() * 1.4;
      ctx.beginPath();
      for (let y = 0; y <= H; y += 16) {
        const px = gx + Math.sin(y * freq + phase) * amp;
        if (y === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }

    // Occasional board joints along the length.
    const joints = 1 + Math.floor(rand() * 2);
    for (let j = 0; j < joints; j++) {
      const jy = rand() * H;
      ctx.fillStyle = "rgba(90, 55, 25, 0.35)";
      ctx.fillRect(x0, jy, bw, 1.5);
    }

    // Seam between boards.
    ctx.fillStyle = "rgba(95, 60, 28, 0.45)";
    ctx.fillRect(x0, 0, 1.2, H);
  }

  // Fine speckle so the surface does not look flat under the clearcoat.
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 10;
    img.data[i] = Math.min(255, Math.max(0, img.data[i]! + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1]! + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Where the pin's number is painted (height fractions): the neck and head, which show above the pin in front. */
const NUMBER_FROM = 0.72;
const NUMBER_TO = 0.96;

/**
 * Pin skin: white with two red stripes below the neck and the pin's number
 * painted on the neck and head (v = height fraction; u = around the pin, with
 * u = 0 facing the bowler). The number is painted front and back.
 */
function drawPinTexture(number?: number): THREE.CanvasTexture {
  const W = 512;
  const H = 1024;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = SCENE.pinStripe;
  const band = (from: number, to: number) => ctx.fillRect(0, (1 - to) * H, W, (to - from) * H);
  band(0.6, 0.62);
  band(0.635, 0.655);

  // The number: bold navy, condensed to fit the front of the neck (plain pins have none).
  if (number === undefined) {
    const plain = new THREE.CanvasTexture(c);
    plain.colorSpace = THREE.SRGBColorSpace;
    return plain;
  }
  const top = (1 - NUMBER_TO) * H;
  const tall = (NUMBER_TO - NUMBER_FROM) * H;
  ctx.fillStyle = SCENE.pinNumber;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(tall * 0.95)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  const label = String(number);
  for (const x of [0, W / 2, W]) ctx.fillText(label, x, top + tall / 2, W * 0.4);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Subtle marbling, multiplied with the ball's brand colour. */
function drawBallTexture(seed: number): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = canvas(S, S / 2);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S / 2);
  ctx.filter = "blur(6px)";
  for (let i = 0; i < 40; i++) {
    const shade = 200 + Math.floor(rand() * 55);
    ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.25 + rand() * 0.35})`;
    ctx.lineWidth = 6 + rand() * 18;
    ctx.beginPath();
    let x = rand() * S;
    let y = rand() * (S / 2);
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (rand() - 0.5) * 160;
      y += (rand() - 0.5) * 90;
      ctx.quadraticCurveTo(x + (rand() - 0.5) * 80, y + (rand() - 0.5) * 80, x, y);
    }
    ctx.stroke();
  }
  ctx.filter = "none";
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function buildPinGeometry(): THREE.LatheGeometry {
  const curve = new THREE.SplineCurve(PIN_PROFILE.map(([h, r]) => new THREE.Vector2(h, r)));
  const dense = curve.getPoints(400);
  const radiusAt = (h: number) => {
    for (let i = 1; i < dense.length; i++) {
      const a = dense[i - 1]!;
      const b = dense[i]!;
      if (h <= b.x) {
        const t = b.x === a.x ? 0 : (h - a.x) / (b.x - a.x);
        return Math.max(0, a.y + (b.y - a.y) * t);
      }
    }
    return 0;
  };

  const N = 90;
  const points: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= N; i++) {
    const h = i / N;
    points.push(new THREE.Vector2(radiusAt(h) * PIN_MAX_RADIUS, h * PIN_HEIGHT));
  }
  return new THREE.LatheGeometry(points, 40);
}

/**
 * Every texture and the pin shape are made once and reused: drawing them
 * (the wood grain is drawn pixel by pixel) is the slow part of putting the
 * lane on screen, and the lane is rebuilt for every doctor. A texture shared
 * this way is simply uploaded again by the next scene after the last one
 * disposes it.
 */
const made = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  if (!made.has(key)) made.set(key, make());
  return made.get(key) as T;
}
export const createWoodTexture = () => once("wood", drawWoodTexture);

/** A soft glow across a strip: bright in the middle, fading to nothing at both edges (u across, white so it takes any colour). */
function drawGlowTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(128, 4);
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.42, "rgba(255,255,255,0.55)");
  g.addColorStop(0.5, "rgba(255,255,255,1)");
  g.addColorStop(0.58, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
export const createGlowTexture = () => once("glow", drawGlowTexture);

/** An overhead lane monitor: a navy screen in a gold frame, with a title (the lane's number, or the game's name over the doctor's lane). */
function drawScreenTexture(label: string): THREE.CanvasTexture {
  const W = 1024;
  const H = 384;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = "#0b1440";
  ctx.fillRect(0, 0, W, H);
  // Faint scan rows, like a real scoreboard monitor.
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 3);
  ctx.strokeStyle = SCENE.screenFrame;
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, W - 22, H - 22);
  ctx.fillStyle = SCENE.screenFrame;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${label.length > 3 ? 120 : 210}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(label, W / 2, H / 2 + 8, W - 120);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
export const createScreenTexture = (label: string) => once(`screen-${label}`, () => drawScreenTexture(label));
export const createPinTexture = (number?: number) => once(`pin-${number ?? "plain"}`, () => drawPinTexture(number));
export const createBallTexture = (seed: number) => once(`ball-${seed}`, () => drawBallTexture(seed));
export const createPinGeometry = () => once("pin-geometry", buildPinGeometry);
