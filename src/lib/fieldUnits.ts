import type { FieldView } from "./types";

/*
 * Field measurements shared by the drawing code (field.tsx) and pure code the
 * API function also loads (fieldConvert, bulkEdit), so neither pulls in React.
 */

/** Lacrosse views (men's, women's, box): no line of scrimmage, no yard lines, markings from the field specs. */
export const isLax = (view: FieldView): view is LaxView => view in LAX_GEOM;

export type LaxView = "lax_full" | "lax_half" | "wlax_full" | "wlax_half" | "box_full" | "box_half";
export type LaxSport = "mens_field" | "womens_field" | "box";

/**
 * Where a lacrosse view sits on the canvas: `u` canvas units per yard and the
 * top-left corner of the field. Full views run goal to goal across the canvas;
 * half views put the end line (or end boards) at the top and midfield at the
 * bottom, the end coaches draw settled offense and defense on. `length`,
 * `width` and `goal` (goal line from the end line) are the field's own yards,
 * from lib/fieldSpec.ts.
 */
export const LAX_GEOM = {
  lax_full: { sport: "mens_field", u: 9, x0: 25, y0: 60, vertical: false, lengthShown: 110, length: 110, width: 60, goal: 15 },
  lax_half: { sport: "mens_field", u: 11.2, x0: 184, y0: 22, vertical: true, lengthShown: 55, length: 110, width: 60, goal: 15 },
  wlax_full: { sport: "womens_field", u: 8.25, x0: 25, y0: 62, vertical: false, lengthShown: 120, length: 120, width: 65, goal: 10 },
  wlax_half: { sport: "womens_field", u: 10.2, x0: 188.5, y0: 24, vertical: true, lengthShown: 60, length: 120, width: 65, goal: 10 },
  box_full: { sport: "box", u: 14.8, x0: 26.7, y0: 120.3, vertical: false, lengthShown: 200 / 3, length: 200 / 3, width: 85 / 3, goal: 4 },
  box_half: { sport: "box", u: 18.4, x0: 259.3, y0: 23.3, vertical: true, lengthShown: 100 / 3, length: 200 / 3, width: 85 / 3, goal: 4 },
} as const satisfies Record<string, { sport: LaxSport; u: number; x0: number; y0: number; vertical: boolean; lengthShown: number; length: number; width: number; goal: number }>;

/** The geometry for any view; non-lacrosse views use the men's half field, so a drawing on the whiteboard lands in the same spot. */
export const laxGeom = (view: FieldView) => (isLax(view) ? LAX_GEOM[view] : LAX_GEOM.lax_half);

/** Which game a view draws, or null for the whiteboard and old football views. */
export const sportOf = (view: FieldView): LaxSport | null => (isLax(view) ? LAX_GEOM[view].sport : null);

/**
 * A spot on a lacrosse view, in field yards: `along` goal to goal from the near
 * end line, `across` sideline to sideline.
 */
export function laxAt(view: FieldView, along: number, across: number) {
  const g = laxGeom(view);
  return g.vertical ? { x: g.x0 + across * g.u, y: g.y0 + along * g.u } : { x: g.x0 + along * g.u, y: g.y0 + across * g.u };
}

/** How far in from the canvas edge each field view draws its sidelines. */
export const fieldInset = (view: FieldView) => (view === "flag" ? 96 : isLax(view) ? LAX_GEOM[view].x0 : 34);

/** Yard spacing for each view, in canvas units per 5 yards. */
export const SPACING: Record<FieldView, number> = {
  full: 48,
  half: 72,
  redzone: 104,
  flag: 60,
  blank: 0,
  lax_full: LAX_GEOM.lax_full.u * 5,
  lax_half: LAX_GEOM.lax_half.u * 5,
  wlax_full: LAX_GEOM.wlax_full.u * 5,
  wlax_half: LAX_GEOM.wlax_half.u * 5,
  box_full: LAX_GEOM.box_full.u * 5,
  box_half: LAX_GEOM.box_half.u * 5,
};
/** Canvas units per yard in a view (0 for the whiteboard), for distance read-outs. */
export const unitsPerYard = (view: FieldView) => SPACING[view] / 5;
