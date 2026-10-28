import { CAMERA, verticalFovFor } from "@/lib/laneLayout";

type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

const EYE: V3 = [...CAMERA.position];
const FORWARD = norm(sub([...CAMERA.target], EYE));
const RIGHT = norm(cross(FORWARD, [0, 1, 0]));
const UP = cross(RIGHT, FORWARD);

export interface Projector {
  (x: number, y: number, z: number): { x: number; y: number; depth: number };
}

export function createProjector(width: number, height: number): Projector {
  const aspect = width / Math.max(height, 1);
  const tanHalf = Math.tan(((verticalFovFor(aspect) * Math.PI) / 180) / 2);
  return (x, y, z) => {
    const d = sub([x, y, z], EYE);
    const depth = Math.max(dot(d, FORWARD), 0.01);
    const ndcX = dot(d, RIGHT) / depth / (tanHalf * aspect);
    const ndcY = dot(d, UP) / depth / tanHalf;
    return { x: ((ndcX + 1) / 2) * width, y: ((1 - ndcY) / 2) * height, depth };
  };
}
