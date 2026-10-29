import { MENS_FIELD } from "./fieldSpec";
import { LAX_GEOM, laxAt } from "./fieldUnits";
import { CANVAS_H, CANVAS_W } from "./types";

/**
 * Men's field lacrosse markings, drawn from the reviewed field spec
 * (lib/fieldSpec.ts, docs/field-spec-mens.md). Every line is placed in field
 * yards (`along` goal to goal from the near end line, `across` sideline to
 * sideline) and mapped onto the canvas by the view's geometry, so the full
 * and half fields share one drawing and the half simply clips at midfield.
 */
type View = keyof typeof LAX_GEOM;
export type LaxChalk = { turf: string; chalk: string; soft: string; crease: string };

const F = MENS_FIELD;
const L = F.lengthYd.value;
const W = F.widthYd.value;
const GOAL = F.goalLineFromEndLineYd.value;
const RESTRAIN = GOAL + F.restrainingFromGoalLineYd.value;
const BOX_W = F.goalAreaWidthYd.value;
const WING_LEN = F.wingLineLengthYd.value;
const WING_IN = W / 2 - F.wingLineFromCenterYd.value;
const CREASE = F.creaseRadiusFt.value / 3;
const MOUTH = F.goalOpeningFt.value.w / 3;
/** Men's goal: the net's back point sits 7 ft behind the goal line. */
const NET_DEPTH = 7 / 3;

export function LaxField({ view, chalk: c, lineWidth }: { view: View; chalk: LaxChalk; lineWidth: (w: number) => number }) {
  const g = LAX_GEOM[view];
  const at = (along: number, across: number) => laxAt(view, along, across);
  const line = (key: string, a1: number, c1: number, a2: number, c2: number, w = 2, stroke = c.chalk) => {
    const p = at(a1, c1);
    const q = at(a2, c2);
    return <line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={stroke} strokeWidth={lineWidth(w)} strokeLinecap="round" />;
  };
  const shown = at(g.lengthShown, W);
  const corner = at(0, 0);
  const clip = `lax-clip-${view}`;
  const clipBox = { x: Math.min(corner.x, shown.x) - 6, y: Math.min(corner.y, shown.y) - 6, w: Math.abs(shown.x - corner.x) + 12, h: Math.abs(shown.y - corner.y) + 12 };

  // One end's markings, mirrored for the far end: goal line ends, crease, goal, box.
  const end = (k: string, flip: boolean) => {
    const a = (d: number) => (flip ? L - d : d);
    const mid = at(a(GOAL), W / 2);
    const back = at(a(GOAL - NET_DEPTH), W / 2);
    const postA = at(a(GOAL), W / 2 - MOUTH / 2);
    const postB = at(a(GOAL), W / 2 + MOUTH / 2);
    const boxIn = (W - BOX_W) / 2;
    return (
      <g key={k}>
        <circle cx={mid.x} cy={mid.y} r={CREASE * g.u} fill={c.crease} stroke={c.chalk} strokeWidth={lineWidth(2)} />
        <polygon points={`${postA.x},${postA.y} ${back.x},${back.y} ${postB.x},${postB.y}`} fill="none" stroke={c.chalk} strokeWidth={lineWidth(1.6)} strokeLinejoin="round" />
        {line(`${k}-mouth`, a(GOAL), W / 2 - MOUTH / 2, a(GOAL), W / 2 + MOUTH / 2, 3)}
        {line(`${k}-restrain`, a(RESTRAIN), 0, a(RESTRAIN), W, 2.4)}
        {line(`${k}-box-a`, a(0), boxIn, a(RESTRAIN), boxIn, 1.8, c.soft)}
        {line(`${k}-box-b`, a(0), W - boxIn, a(RESTRAIN), W - boxIn, 1.8, c.soft)}
      </g>
    );
  };

  const centre = at(L / 2, W / 2);
  const xArm = 0.6 * g.u;
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={c.turf} />
      <defs>
        <clipPath id={clip}>
          <rect x={clipBox.x} y={clipBox.y} width={clipBox.w} height={clipBox.h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {(() => {
          const p = at(0, 0);
          const q = at(L, W);
          return <rect x={Math.min(p.x, q.x)} y={Math.min(p.y, q.y)} width={Math.abs(q.x - p.x)} height={Math.abs(q.y - p.y)} fill="none" stroke={c.chalk} strokeWidth={lineWidth(3)} />;
        })()}
        {line("midfield", L / 2, 0, L / 2, W, 2.6)}
        {line("wing-a", L / 2 - WING_LEN / 2, WING_IN, L / 2 + WING_LEN / 2, WING_IN, 2)}
        {line("wing-b", L / 2 - WING_LEN / 2, W - WING_IN, L / 2 + WING_LEN / 2, W - WING_IN, 2)}
        <path d={`M${centre.x - xArm} ${centre.y - xArm}L${centre.x + xArm} ${centre.y + xArm}M${centre.x + xArm} ${centre.y - xArm}L${centre.x - xArm} ${centre.y + xArm}`} stroke={c.chalk} strokeWidth={lineWidth(2)} />
        {end("near", false)}
        {end("far", true)}
      </g>
    </g>
  );
}
