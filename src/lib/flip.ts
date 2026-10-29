import { CANVAS_W } from "./types";
import type { Scene, SceneNode } from "./types";

/** Left to right across the middle of the field. Letters and text stay readable; lines and shapes mirror. */
function mirrorNode(n: SceneNode): SceneNode {
  const x = CANVAS_W - n.x;
  if (n.kind === "player") return { ...n, x, rotation: -n.rotation };
  if (n.kind === "text") return { ...n, x, rotation: -n.rotation, align: n.align === "start" ? "end" : n.align === "end" ? "start" : n.align };
  if (n.kind === "path")
    return {
      ...n,
      x,
      rotation: -n.rotation,
      points: n.points.map((p) => ({ x: -p.x, y: p.y })),
      handles: Object.fromEntries(Object.entries(n.handles).map(([k, h]) => [k, { x: -h.x, y: h.y }])),
    };
  return { ...n, x, rotation: -n.rotation, scaleX: -n.scaleX };
}

/** The same play mirrored left to right. Node ids are kept, so lines stay attached to their players. */
export const mirrorScene = (scene: Scene): Scene => ({ ...scene, nodes: scene.nodes.map(mirrorNode) });

/** "Attack Right" ↔ "Attack Left", keeping the coach's capitals. */
export function swapSides(text: string): string {
  return text.replace(/\b(right|left)\b/gi, (word) => {
    const to = word.toLowerCase() === "right" ? "left" : "right";
    if (word === word.toUpperCase()) return to.toUpperCase();
    return word[0] === word[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
  });
}
