// Sport formats and the men's field lacrosse field spec.
//
// STATUS: APPROVED for the regulation field by Wes on 2026-10-29 (see
// docs/field-spec-mens.md). The Designer draws from it (lib/laxField.tsx).
// Every number carries a source id (see SOURCES). Youth sizes stay out until a
// primary source confirms them; a lacrosse coach should still check before launch.
//
// Units are yards unless the name says otherwise. Lengths run goal to goal
// ("length", 110), widths run sideline to sideline ("width", 60).

export type SportFormat = "mens_field" | "womens_field" | "box";

/** Formats that may be drawn today. Women's and box wait for their own spec and terminology review. */
export const ENABLED_FORMATS: readonly SportFormat[] = ["mens_field"];

export type SourceId = "USL_LINE_2026" | "USL_YOUTH_2ND" | "NFHS_ARTICLE" | "SECONDARY";

export const SOURCES: Record<SourceId, { title: string; url: string; kind: "primary" | "secondary"; note: string }> = {
  USL_LINE_2026: {
    title: "US Lacrosse, How to line a men's field (2026)",
    url: "https://www.usalacrosse.com/sites/default/files/documents/Rules/how-to-line-mens-field-2026.pdf",
    kind: "primary",
    note: "Line-by-line marking guide. Text read; the diagram itself was not viewed.",
  },
  USL_YOUTH_2ND: {
    title: "US Lacrosse, Youth Rules & Best Practices for Boys, 2nd edition",
    url: "https://cdn1.sportngin.com/attachments/document/1bef-3086746/US_Lacrosse_-_Boys_Youth_Rules_.pdf",
    kind: "primary",
    note: "Field on p. 28. Calls the crease a 9-foot diameter there but a 9-foot radius on pp. 8 and 59.",
  },
  NFHS_ARTICLE: {
    title: "NFHS, Field/equipment requirements, officiating clarifications lead high school boys lacrosse rules changes",
    url: "https://www.nfhs.org/articles/fieldequipment-requirements-officiating-clarifications-lead-high-school-boys-lacrosse-rules-changes/",
    kind: "primary",
    note: "Only the NFHS summary was read. The NFHS rule book (Rule 1) is paid and was not read.",
  },
  SECONDARY: {
    title: "Third-party field guides (dimensions.com, lacrosseballstore.com)",
    url: "https://www.dimensions.com/element/lacrosse-field",
    kind: "secondary",
    note: "Used only to cross-check. They match the primary numbers except where flagged.",
  },
};

export type Sourced<T> = { value: T; src: SourceId[]; note?: string };
const s = <T,>(value: T, src: SourceId[], note?: string): Sourced<T> => ({ value, src, note });

export type FieldSpec = {
  format: SportFormat;
  level: "regulation";
  lengthYd: Sourced<number>;
  widthYd: Sourced<number>;
  /** Narrowest allowed width when a site can't take 60. */
  minWidthYd: Sourced<number>;
  goalLineFromEndLineYd: Sourced<number>;
  goalOpeningFt: Sourced<{ w: number; h: number }>;
  creaseRadiusFt: Sourced<number>;
  /** Restraining (defensive area) line, parallel to the goal line, sideline to sideline. */
  restrainingFromGoalLineYd: Sourced<number>;
  /** Goal area box: wide x deep from the goal line; deep reaches the restraining line. */
  goalAreaWidthYd: Sourced<number>;
  /** Wing lines run parallel to the sidelines, centred on the midfield line. */
  wingLineLengthYd: Sourced<number>;
  wingLineFromCenterYd: Sourced<number>;
  midfieldLineInches: Sourced<number>;
  goalLineInches: Sourced<number>;
  /** Scorer's table lines, measured from the midfield line. */
  tableLinesFromCenterYd: Sourced<number>;
  coachesAreaLengthYd: Sourced<number>;
  coachesAreaFromSidelineYd: Sourced<number>;
  review: { status: "draft" | "approved"; reviewer: string; reviewedOn?: string; openQuestions: string[] };
};

export const MENS_FIELD: FieldSpec = {
  format: "mens_field",
  level: "regulation",
  lengthYd: s(110, ["USL_LINE_2026", "USL_YOUTH_2ND"]),
  widthYd: s(60, ["USL_LINE_2026", "USL_YOUTH_2ND"]),
  minWidthYd: s(53 + 1 / 3, ["USL_LINE_2026", "USL_YOUTH_2ND"]),
  goalLineFromEndLineYd: s(15, ["USL_YOUTH_2ND"], "Not in the line-marking text; confirm against the diagram."),
  goalOpeningFt: s({ w: 6, h: 6 }, ["USL_YOUTH_2ND"]),
  creaseRadiusFt: s(9, ["USL_LINE_2026", "USL_YOUTH_2ND"], "USL youth p. 28 says 9-foot diameter; the line guide and pp. 8, 59 say radius. Radius used."),
  restrainingFromGoalLineYd: s(20, ["USL_LINE_2026"]),
  goalAreaWidthYd: s(40, ["USL_LINE_2026", "USL_YOUTH_2ND"]),
  wingLineLengthYd: s(20, ["USL_LINE_2026"], "10 yards each side of the midfield line."),
  wingLineFromCenterYd: s(20, ["USL_LINE_2026"], "Measured from the field's centre; on a 60-yard field that is 10 yards in from each sideline."),
  midfieldLineInches: s(4, ["USL_LINE_2026"]),
  goalLineInches: s(2, ["USL_LINE_2026"]),
  tableLinesFromCenterYd: s(10, ["USL_LINE_2026"], "NFHS moved this to 5 yards (Rule 1-2-7). Only matters for sideline detail."),
  coachesAreaLengthYd: s(15, ["USL_LINE_2026"], "NFHS moved this to 20 yards (Rule 1-2-8)."),
  coachesAreaFromSidelineYd: s(6, ["USL_LINE_2026"]),
  review: {
    status: "approved",
    reviewer: "Wes (a lacrosse coach should still check before launch)",
    reviewedOn: "2026-10-29",
    openQuestions: [
      "Goal line distance (15 yd) comes from the youth guide, not the line-marking guide.",
      "NFHS rule book and NCAA rule book were not read. Confirm high school and college fields match.",
      "Youth sizes: 60-80 x 30-50 yd and 4x4 ft goals come from a secondary source only. Do not ship until a primary source confirms.",
    ],
  },
};

/** The Designer switches to lacrosse fields and players once the men's field spec is approved. */
export const LAX_FIELDS_ON = MENS_FIELD.review.status === "approved";

export const FIELD_SPECS: Record<SportFormat, FieldSpec | null> = {
  mens_field: MENS_FIELD,
  womens_field: null,
  box: null,
};
