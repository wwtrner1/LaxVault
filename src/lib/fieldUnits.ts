import type { FieldView } from "./types";

/*
 * Field measurements shared by the drawing code (field.tsx) and pure code the
 * API function also loads (fieldConvert, bulkEdit), so neither pulls in React.
 */

/** Men's field lacrosse views: no line of scrimmage, no yard lines, markings from the field spec. */
export const isLax = (view: FieldView) => view === "lax_full" || view === "lax_half";

/**
 * Where a lacrosse view sits on the canvas: `u` canvas units per yard and the
 * top-left corner of the field. The full field runs goal to goal across the
 * canvas (110 x 60 yd); the half field puts the end line at the top and the
 * midfield line at the bottom (55 x 60 yd), the end coaches draw settled
 * offense and defense on.
 */
export const LAX_GEOM = {
  lax_full: { u: 9, x0: 25, y0: 60, vertical: false, lengthShown: 110 },
  lax_half: { u: 11.2, x0: 184, y0: 22, vertical: true, lengthShown: 55 },
} as const;

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
};
/** Canvas units per yard in a view (0 for the whiteboard), for distance read-outs. */
export const unitsPerYard = (view: FieldView) => SPACING[view] / 5;
