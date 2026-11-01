import { setsFor, type LaxSet } from "../lib/laxSets";
import type { Scene } from "../lib/types";

/** Spot on the tile icon: the goal near the top, as on the half field. */
const ix = (x: number) => 28 + x * 1.5;
const iy = (d: number) => 6 + (d + 8) * 1.25;

/** The man-to-man tile shows pairs, since its spots come from the offense on the field. */
const PAIRS = [
  [-9, 16],
  [9, 16],
  [-15, 6],
  [15, 6],
  [0, -8],
] as const;

function SetIcon({ set }: { set: LaxSet }) {
  // The box floor is small: spread its spots so the tile reads.
  const m = set.sport === "box" ? 1.6 : 1;
  const tri = (x: number, d: number, k: string) => (
    <polygon key={k} points={`${ix(x)},${iy(d) - 3} ${ix(x) - 3},${iy(d) + 2.4} ${ix(x) + 3},${iy(d) + 2.4}`} fill="currentColor" />
  );
  return (
    <svg viewBox="0 0 56 44" aria-hidden="true">
      <circle cx={ix(0)} cy={iy(0)} r="4.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55" />
      <line x1={ix(-1)} y1={iy(0)} x2={ix(1)} y2={iy(0)} stroke="currentColor" strokeWidth="1.6" />
      {set.id === "d-man"
        ? PAIRS.flatMap(([x, d], k) => [
            <circle key={`o${k}`} cx={ix(x)} cy={iy(d)} r="2.6" fill="none" stroke="currentColor" strokeWidth="1.2" />,
            tri(x + (0 - x) * 0.14, d - (d - 0) * 0.16, `d${k}`),
          ])
        : set.spots.map((s, k) =>
            set.side === "offense" ? <circle key={k} cx={ix(s.x * m)} cy={iy(s.d * m)} r="2.8" fill="currentColor" /> : tri(s.x * m, s.d * m, String(k)),
          )}
    </svg>
  );
}

/** Sets panel on lacrosse fields: tap a set and the whole offense or defense lands around the near goal. */
export function LaxSetLibrary({ view, onDrop }: { view: Scene["view"]; onDrop: (set: LaxSet) => void }) {
  const sets = setsFor(view);
  const tile = (s: LaxSet) => (
    <button key={s.id} type="button" className="rl-tile" onClick={() => onDrop(s)} title={s.hint} aria-label={`${s.name}. ${s.hint}`}>
      <SetIcon set={s} />
      <span>{s.name}</span>
    </button>
  );
  return (
    <div className="rl rl-sets">
      <span className="fl-label">Offense · {sets.players} on the near goal</span>
      <div className="rl-grid">{sets.offense.map(tile)}</div>
      <span className="fl-label">Defense · goalie included</span>
      <div className="rl-grid">{sets.defense.map(tile)}</div>
      <p className="dz-note">
        Tap a set to drop it. A new offense replaces the last offensive set, and the same for defense, so you can try a few. Letters are a starting point: pick a
        player and change the letter in Selection.
      </p>
    </div>
  );
}
