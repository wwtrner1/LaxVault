import type { ReactElement } from "react";
import { BOX_FLOOR, MENS_FIELD, WOMENS_FIELD } from "./fieldSpec";
import { LAX_GEOM, laxAt, type LaxView } from "./fieldUnits";
import { CANVAS_H, CANVAS_W } from "./types";

/**
 * Lacrosse markings drawn from the field specs (lib/fieldSpec.ts): men's
 * field, women's field and the box floor. Every line is placed in field yards
 * (`along` goal to goal from the near end line, `across` sideline to
 * sideline) and mapped onto the canvas by the view's geometry, so the full
 * and half views share one drawing and the half simply clips at midfield.
 */
export type LaxChalk = { turf: string; chalk: string; soft: string; crease: string };
type Draw = {
  view: LaxView;
  c: LaxChalk;
  lw: (w: number) => number;
  at: (along: number, across: number) => { x: number; y: number };
  line: (key: string, a1: number, c1: number, a2: number, c2: number, w?: number, stroke?: string, dash?: string) => ReactElement;
  u: number;
  L: number;
  W: number;
};

const M = 1.0936; // yards in a metre

export function LaxField({ view, chalk: c, lineWidth }: { view: LaxView; chalk: LaxChalk; lineWidth: (w: number) => number }) {
  const g = LAX_GEOM[view];
  const L = g.length;
  const W = g.width;
  const at = (along: number, across: number) => laxAt(view, along, across);
  const line: Draw["line"] = (key, a1, c1, a2, c2, w = 2, stroke = c.chalk, dash) => {
    const p = at(a1, c1);
    const q = at(a2, c2);
    return <line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={stroke} strokeWidth={lineWidth(w)} strokeLinecap="round" strokeDasharray={dash} />;
  };
  const d: Draw = { view, c, lw: lineWidth, at, line, u: g.u, L, W };
  const shown = at(g.lengthShown, W);
  const corner = at(0, 0);
  const clip = `lax-clip-${view}`;
  const clipBox = { x: Math.min(corner.x, shown.x) - 6, y: Math.min(corner.y, shown.y) - 6, w: Math.abs(shown.x - corner.x) + 12, h: Math.abs(shown.y - corner.y) + 12 };

  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={c.turf} />
      <defs>
        <clipPath id={clip}>
          <rect x={clipBox.x} y={clipBox.y} width={clipBox.w} height={clipBox.h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{g.sport === "box" ? <Box d={d} /> : g.sport === "womens_field" ? <Womens d={d} /> : <Mens d={d} />}</g>
    </g>
  );
}

/** The outer boundary as a rectangle with optional rounded corners (the box boards). */
function Boundary({ d, radius = 0, width = 3 }: { d: Draw; radius?: number; width?: number }) {
  const p = d.at(0, 0);
  const q = d.at(d.L, d.W);
  return (
    <rect
      x={Math.min(p.x, q.x)}
      y={Math.min(p.y, q.y)}
      width={Math.abs(q.x - p.x)}
      height={Math.abs(q.y - p.y)}
      rx={radius * d.u}
      fill="none"
      stroke={d.c.chalk}
      strokeWidth={d.lw(width)}
    />
  );
}

/** A goal: the mouth on the goal line and the net's back point behind it. */
function Goal({ d, along, mouth, depth, flip, k }: { d: Draw; along: number; mouth: number; depth: number; flip: boolean; k: string }) {
  const back = d.at(flip ? along + depth : along - depth, d.W / 2);
  const a = d.at(along, d.W / 2 - mouth / 2);
  const b = d.at(along, d.W / 2 + mouth / 2);
  return (
    <g>
      <polygon points={`${a.x},${a.y} ${back.x},${back.y} ${b.x},${b.y}`} fill="none" stroke={d.c.chalk} strokeWidth={d.lw(1.6)} strokeLinejoin="round" />
      {d.line(`${k}-mouth`, along, d.W / 2 - mouth / 2, along, d.W / 2 + mouth / 2, 3)}
    </g>
  );
}

/** Half a circle of radius r (yards) around a goal, bulging toward midfield. */
function halfArc(d: Draw, along: number, r: number, flip: boolean) {
  const a = d.at(along, d.W / 2 - r);
  const b = d.at(along, d.W / 2 + r);
  const R = r * d.u;
  const vertical = LAX_GEOM[d.view].vertical;
  // Which way the arc sweeps depends on the view's orientation and the end.
  const sweep = vertical ? (flip ? 1 : 0) : flip ? 0 : 1;
  return `M${a.x} ${a.y}A${R} ${R} 0 0 ${sweep} ${b.x} ${b.y}`;
}

/* ------------------------------------------------------------------ men's --- */
function Mens({ d }: { d: Draw }) {
  const F = MENS_FIELD;
  const { L, W, line, at, c, lw, u } = d;
  const GOAL = F.goalLineFromEndLineYd.value;
  const RESTRAIN = GOAL + F.restrainingFromGoalLineYd.value;
  const BOX_W = F.goalAreaWidthYd.value;
  const WING_LEN = F.wingLineLengthYd.value;
  const WING_IN = W / 2 - F.wingLineFromCenterYd.value;
  const CREASE = F.creaseRadiusFt.value / 3;
  const MOUTH = F.goalOpeningFt.value.w / 3;
  const end = (k: string, flip: boolean) => {
    const a = (x: number) => (flip ? L - x : x);
    const mid = at(a(GOAL), W / 2);
    const boxIn = (W - BOX_W) / 2;
    return (
      <g key={k}>
        <circle cx={mid.x} cy={mid.y} r={CREASE * u} fill={c.crease} stroke={c.chalk} strokeWidth={lw(2)} />
        <Goal d={d} k={k} along={a(GOAL)} mouth={MOUTH} depth={7 / 3} flip={flip} />
        {line(`${k}-restrain`, a(RESTRAIN), 0, a(RESTRAIN), W, 2.4)}
        {line(`${k}-box-a`, a(0), boxIn, a(RESTRAIN), boxIn, 1.8, c.soft)}
        {line(`${k}-box-b`, a(0), W - boxIn, a(RESTRAIN), W - boxIn, 1.8, c.soft)}
      </g>
    );
  };
  const centre = at(L / 2, W / 2);
  const xArm = 0.6 * u;
  return (
    <>
      <Boundary d={d} />
      {line("midfield", L / 2, 0, L / 2, W, 2.6)}
      {line("wing-a", L / 2 - WING_LEN / 2, WING_IN, L / 2 + WING_LEN / 2, WING_IN, 2)}
      {line("wing-b", L / 2 - WING_LEN / 2, W - WING_IN, L / 2 + WING_LEN / 2, W - WING_IN, 2)}
      <path d={`M${centre.x - xArm} ${centre.y - xArm}L${centre.x + xArm} ${centre.y + xArm}M${centre.x + xArm} ${centre.y - xArm}L${centre.x - xArm} ${centre.y + xArm}`} stroke={c.chalk} strokeWidth={lw(2)} />
      {end("near", false)}
      {end("far", true)}
    </>
  );
}

/* ---------------------------------------------------------------- women's --- */
function Womens({ d }: { d: Draw }) {
  const F = WOMENS_FIELD;
  const { L, W, line, at, c, lw, u } = d;
  const GOAL = F.goalLineFromEndLineYd.value;
  const RESTRAIN = GOAL + F.restrainingFromGoalLineYd.value;
  const CIRCLE = F.goalCircleRadiusFt.value / 3;
  const ARC = F.arcFromGoalM.value * M;
  const FAN = F.fanFromGoalM.value * M;
  const MOUTH = F.goalOpeningFt.value.w / 3;
  const HASH = 1 / 3 / 2; // 1 ft marks, half each side of the arc
  const end = (k: string, flip: boolean) => {
    const a = (x: number) => (flip ? L - x : x);
    const dir = flip ? -1 : 1;
    const mid = at(a(GOAL), W / 2);
    // Hash marks on the 8 m arc: the centre one, then 4, 8 and 12 m either side measured along the arc.
    const hashes = [0, ...F.arcHashesM.value.flatMap((m) => [m, -m])].map((m) => {
      const ang = (m * M) / ARC; // radians from straight out
      const along = a(GOAL) + dir * Math.cos(ang) * ARC;
      const across = W / 2 + Math.sin(ang) * ARC;
      const p = at(along - dir * Math.cos(ang) * HASH * 3, across - Math.sin(ang) * HASH * 3);
      const q = at(along + dir * Math.cos(ang) * HASH * 3, across + Math.sin(ang) * HASH * 3);
      return <line key={`${k}-h${m}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={c.chalk} strokeWidth={lw(2.4)} />;
    });
    const dot = (side: number) => {
      const p = at(a(GOAL - F.belowGoalDotsYd.value), W / 2 + side * ARC);
      return <circle key={`${k}-dot${side}`} cx={p.x} cy={p.y} r={0.35 * u} fill={c.chalk} />;
    };
    return (
      <g key={k}>
        <path d={halfArc(d, a(GOAL), FAN, flip)} fill="none" stroke={c.soft} strokeWidth={lw(1.8)} strokeDasharray={`${0.9 * u} ${0.7 * u}`} />
        <path d={halfArc(d, a(GOAL), ARC, flip)} fill="none" stroke={c.chalk} strokeWidth={lw(2)} />
        {line(`${k}-gl-ext`, a(GOAL), W / 2 - ARC, a(GOAL), W / 2 + ARC, 1.4, c.soft)}
        {hashes}
        {dot(-1)}
        {dot(1)}
        <circle cx={mid.x} cy={mid.y} r={CIRCLE * u} fill={c.crease} stroke={c.chalk} strokeWidth={lw(2)} />
        <Goal d={d} k={k} along={a(GOAL)} mouth={MOUTH} depth={7 / 3} flip={flip} />
        {line(`${k}-restrain`, a(RESTRAIN), 0, a(RESTRAIN), W, 2.4)}
      </g>
    );
  };
  const centre = at(L / 2, W / 2);
  const cl = (F.centerLineM.value * M) / 2;
  return (
    <>
      <Boundary d={d} />
      <circle cx={centre.x} cy={centre.y} r={(F.centerCircleRadiusFt.value / 3) * u} fill="none" stroke={c.chalk} strokeWidth={lw(2)} />
      {line("centre-line", L / 2, W / 2 - cl, L / 2, W / 2 + cl, 2.6)}
      {end("near", false)}
      {end("far", true)}
    </>
  );
}

/* -------------------------------------------------------------------- box --- */
function Box({ d }: { d: Draw }) {
  const F = BOX_FLOOR;
  const { L, W, line, at, c, lw, u } = d;
  const GOAL = F.goalLineFromEndBoardsFt.value / 3;
  const CREASE = F.creaseRadiusIn.value / 36;
  const BACK = F.creaseBackFt.value / 3;
  const MOUTH = F.goalOpeningIn.value.w / 36;
  const RESTRAIN = F.restrainingFromCenterFt.value / 3;
  const SPOT = F.cornerSpotFromBoardsYd.value;
  const SPOT_IN = F.cornerSpotInsideRestrainingYd.value;
  const vertical = LAX_GEOM[d.view].vertical;
  const end = (k: string, flip: boolean) => {
    const a = (x: number) => (flip ? L - x : x);
    // The crease: a circle cut off by a line one foot behind the goal line.
    const cut = a(GOAL - BACK);
    const off = Math.sqrt(Math.max(0, CREASE * CREASE - BACK * BACK));
    const p = at(cut, W / 2 - off);
    const q = at(cut, W / 2 + off);
    const R = CREASE * u;
    const sweep = vertical ? (flip ? 1 : 0) : flip ? 0 : 1;
    const crease = `M${p.x} ${p.y}A${R} ${R} 0 1 ${sweep} ${q.x} ${q.y}Z`;
    const spot = (side: number) => {
      const s = at(a(L / 2 - RESTRAIN - SPOT_IN), side < 0 ? SPOT : W - SPOT);
      const x = 0.5 * u;
      return <path key={`${k}-spot${side}`} d={`M${s.x - x} ${s.y - x}L${s.x + x} ${s.y + x}M${s.x + x} ${s.y - x}L${s.x - x} ${s.y + x}`} stroke={c.chalk} strokeWidth={lw(2)} />;
    };
    return (
      <g key={k}>
        <path d={crease} fill={c.crease} stroke={c.chalk} strokeWidth={lw(2)} />
        <Goal d={d} k={k} along={a(GOAL)} mouth={MOUTH} depth={1.2} flip={flip} />
        {line(`${k}-restrain`, a(L / 2 - RESTRAIN), 0, a(L / 2 - RESTRAIN), W, 2.4)}
        {spot(-1)}
        {spot(1)}
      </g>
    );
  };
  const centre = at(L / 2, W / 2);
  return (
    <>
      <Boundary d={d} radius={F.cornerRadiusFt.value / 3} width={4} />
      {line("centre", L / 2, 0, L / 2, W, 2.6)}
      <circle cx={centre.x} cy={centre.y} r={(F.faceoffCircleRadiusFt.value / 3) * u} fill="none" stroke={c.chalk} strokeWidth={lw(2)} />
      <circle cx={centre.x} cy={centre.y} r={(F.faceoffDotRadiusIn.value / 36) * u} fill="none" stroke={c.chalk} strokeWidth={lw(1.4)} strokeDasharray={`${0.25 * u} ${0.2 * u}`} />
      {end("near", false)}
      {end("far", true)}
    </>
  );
}
