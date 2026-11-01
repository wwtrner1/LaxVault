import { frameScene } from "../lib/frames";
import { FieldBackground } from "../lib/field";
import { drawOrder, MarkerDefs, NodeLayer, strokeColors } from "../lib/render";
import { ballAt, isBall, positionsAt, stepAt, type Timeline } from "../lib/runPlay";
import { CANVAS_H, CANVAS_W } from "../lib/types";
import type { Scene } from "../lib/types";

/**
 * One frame of a running play: players where they are at `t`, the ball in a
 * stick or in the air, and the lines of the step that's running drawn bold
 * while the rest fade. Shared by Run play, the player link and live mode.
 */
export function RunField({ scene: saved, tl, t, label }: { scene: Scene; tl: Timeline; t: number; label: string }) {
  // A multi-frame play shows its first frame (buildTimeline runs that one too).
  const scene = frameScene(saved);
  const at = positionsAt(scene, tl, t);
  const ball = ballAt(tl, at, t);
  const now = stepAt(tl, t);
  const multi = tl.steps.length > 1;
  const ballNode = tl.ballId ? scene.nodes.find((n) => n.id === tl.ballId) : undefined;
  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} role="img" aria-label={label}>
      <MarkerDefs colors={strokeColors(scene.nodes)} />
      <FieldBackground view={scene.view} losY={scene.losY} />
      {drawOrder(scene.nodes).map((n) => {
        if (n.kind === "path") {
          const s = tl.stepOf.get(n.id);
          const on = s !== undefined && multi ? s === now : true;
          return <NodeLayer key={n.id} node={n} opacity={on ? 0.55 : 0.14} />;
        }
        if (n.kind !== "player") return <NodeLayer key={n.id} node={n} />;
        if (isBall(n) && n.id === tl.ballId) return null;
        const p = at.get(n.id) ?? n;
        return <NodeLayer key={n.id} node={{ ...n, x: p.x, y: p.y }} />;
      })}
      {ball &&
        (ballNode && ballNode.kind === "player" ? (
          <NodeLayer node={{ ...ballNode, x: ball.x, y: ball.y }} />
        ) : (
          <circle cx={ball.x} cy={ball.y} r={7} fill="#F5C518" stroke="#8A6A00" strokeWidth={2} />
        ))}
    </svg>
  );
}
