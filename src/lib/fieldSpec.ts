// Sport formats and their field specs: men's field, women's field, box.
//
// STATUS: APPROVED for the regulation field by Wes on 2026-10-29 (see
// docs/field-spec-mens.md). The Designer draws from it (lib/laxField.tsx).
// Every number carries a source id (see SOURCES). Youth sizes stay out until a
// primary source confirms them; a lacrosse coach should still check before launch.
//
// Units are yards unless the name says otherwise. Lengths run goal to goal
// ("length", 110), widths run sideline to sideline ("width", 60).

export type SportFormat = "mens_field" | "womens_field" | "box";

/** Formats that may be drawn. Women's and box were added on 2026-11-01 at Wes's request, from the sources below (docs/field-spec-womens-box.md). */
export const ENABLED_FORMATS: readonly SportFormat[] = ["mens_field", "womens_field", "box"];

export type SourceId = "USL_LINE_2026" | "USL_YOUTH_2ND" | "NFHS_ARTICLE" | "SECONDARY" | "USL_WOMENS_LINE_2021" | "WL_BOX_2026" | "NLL_2019";

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
  USL_WOMENS_LINE_2021: {
    title: "USA Lacrosse, How to line a women's field (2021)",
    url: "https://www.usalacrosse.com/sites/default/files/documents/Rules/how-to-line-womens-field-2021.pdf",
    kind: "primary",
    note: "Line-by-line marking guide (Rule 1). Text read; the diagram itself was not viewed.",
  },
  WL_BOX_2026: {
    title: "World Lacrosse, Box Lacrosse Rule Book 2026-2028 (v2, May 2026), Rule 1",
    url: "https://worldlacrosse.sport/wp-content/uploads/2026/05/26-28-Box-Rule-Book_v2_0526.pdf",
    kind: "primary",
    note: "Gives the crease, goal, restraining lines, face-off circles and spots, but not the floor's length and width.",
  },
  NLL_2019: {
    title: "National Lacrosse League Rule Book 2019-20, Rules 1-3 and 6",
    url: "https://nll.com/wp-content/uploads/2020/11/NLL-2019-20-Rulebook-FINAL.pdf",
    kind: "primary",
    note: "Same crease, goal and lines as World Lacrosse. The centre spot is 42.5 ft from each side, so the floor is 85 ft wide. The floor diagram's length is an image and was not read.",
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

/**
 * Women's field lacrosse, regulation (USA Lacrosse / NCAA). The field allows a
 * range; the Designer draws the optimum for new construction. Goal circle,
 * arcs and fan are measured in metres in the rules and kept that way here.
 */
export type WomensFieldSpec = {
  format: "womens_field";
  lengthYd: Sourced<number>;
  widthYd: Sourced<number>;
  goalLineFromEndLineYd: Sourced<number>;
  goalOpeningFt: Sourced<{ w: number; h: number }>;
  goalCircleRadiusFt: Sourced<number>;
  /** 8-metre arc: from the centre of the goal line to the arc. */
  arcFromGoalM: Sourced<number>;
  /** Hash marks along the 8-metre arc, metres either side of its centre mark. */
  arcHashesM: Sourced<number[]>;
  /** 12-metre fan: from the centre of the goal line to the fan. */
  fanFromGoalM: Sourced<number>;
  restrainingFromGoalLineYd: Sourced<number>;
  centerCircleRadiusFt: Sourced<number>;
  centerLineM: Sourced<number>;
  /** Dots behind the goal: this far from the 8 m marks on the extended goal line, toward the end line. */
  belowGoalDotsYd: Sourced<number>;
  review: FieldSpec["review"];
};

export const WOMENS_FIELD: WomensFieldSpec = {
  format: "womens_field",
  lengthYd: s(120, ["USL_WOMENS_LINE_2021"], "110 to 140 allowed; 120 is the optimum for new construction."),
  widthYd: s(65, ["USL_WOMENS_LINE_2021"], "60 to 70 allowed; 65 is the optimum."),
  goalLineFromEndLineYd: s(10, ["USL_WOMENS_LINE_2021"], "10 to 20 allowed; goal lines 90 to 100 yards apart, 100 optimum."),
  goalOpeningFt: s({ w: 6, h: 6 }, ["SECONDARY"], "Not in the line-marking guide; same 6 x 6 ft goal as the men's game."),
  goalCircleRadiusFt: s(8.5, ["USL_WOMENS_LINE_2021"], "2.6 m, to the outer edge of the line."),
  arcFromGoalM: s(10.6, ["USL_WOMENS_LINE_2021"], "8 m from the goal circle."),
  arcHashesM: s([4, 8, 12], ["USL_WOMENS_LINE_2021"], "Plus a centre mark and two on the extended goal line."),
  fanFromGoalM: s(14.6, ["USL_WOMENS_LINE_2021"], "12 m from the goal circle."),
  restrainingFromGoalLineYd: s(30, ["USL_WOMENS_LINE_2021"]),
  centerCircleRadiusFt: s(30, ["USL_WOMENS_LINE_2021"]),
  centerLineM: s(3, ["USL_WOMENS_LINE_2021"], "9 ft 11 in, through the circle's centre, parallel to the goal lines."),
  belowGoalDotsYd: s(5, ["USL_WOMENS_LINE_2021"]),
  review: {
    status: "draft",
    reviewer: "Not yet reviewed by a women's coach",
    openQuestions: [
      "The 8 m arc and 12 m fan are drawn as half circles to the extended goal line; check against the rule book diagram.",
      "Goal size comes from a secondary source.",
      "Youth (U8 to U12) fields are smaller and are not drawn.",
    ],
  },
};

/** Box lacrosse floor (World Lacrosse and NLL). Feet, as in the rules. */
export type BoxFloorSpec = {
  format: "box";
  lengthFt: Sourced<number>;
  widthFt: Sourced<number>;
  cornerRadiusFt: Sourced<number>;
  goalLineFromEndBoardsFt: Sourced<number>;
  goalOpeningIn: Sourced<{ w: number; h: number }>;
  creaseRadiusIn: Sourced<number>;
  /** The crease is cut off by a line this far behind the goal line. */
  creaseBackFt: Sourced<number>;
  restrainingFromCenterFt: Sourced<number>;
  faceoffCircleRadiusFt: Sourced<number>;
  faceoffDotRadiusIn: Sourced<number>;
  /** Corner face-off spots: from the side boards, and inside the restraining line toward the goal. */
  cornerSpotFromBoardsYd: Sourced<number>;
  cornerSpotInsideRestrainingYd: Sourced<number>;
  review: FieldSpec["review"];
};

export const BOX_FLOOR: BoxFloorSpec = {
  format: "box",
  lengthFt: s(200, ["SECONDARY"], "Neither rule book text gives the length; arenas are hockey rinks, 180 to 200 ft. 200 is drawn."),
  widthFt: s(85, ["NLL_2019"], "Centre spot 42.5 ft from each side (NLL 6.1)."),
  cornerRadiusFt: s(28, ["SECONDARY"], "Hockey rink corners; not in either rule book text."),
  goalLineFromEndBoardsFt: s(12, ["WL_BOX_2026", "NLL_2019"]),
  goalOpeningIn: s({ w: 57, h: 48 }, ["WL_BOX_2026", "NLL_2019"], "4 ft 9 in wide, 4 ft high."),
  creaseRadiusIn: s(111, ["WL_BOX_2026", "NLL_2019"], "9 ft 3 in from the middle of the goal line."),
  creaseBackFt: s(1, ["WL_BOX_2026"]),
  restrainingFromCenterFt: s(42.5, ["WL_BOX_2026", "NLL_2019"]),
  faceoffCircleRadiusFt: s(11, ["WL_BOX_2026", "NLL_2019"]),
  faceoffDotRadiusIn: s(17, ["WL_BOX_2026", "NLL_2019"]),
  cornerSpotFromBoardsYd: s(5, ["WL_BOX_2026", "NLL_2019"]),
  cornerSpotInsideRestrainingYd: s(5, ["WL_BOX_2026"], "NLL measures from the attack lines instead."),
  review: {
    status: "draft",
    reviewer: "Not yet reviewed by a box coach",
    openQuestions: ["Floor length and corner radius are typical arena values, not from the rule books.", "Bench and penalty-box gates are not drawn."],
  },
};

export const FIELD_SPECS: { mens_field: FieldSpec; womens_field: WomensFieldSpec; box: BoxFloorSpec } = {
  mens_field: MENS_FIELD,
  womens_field: WOMENS_FIELD,
  box: BOX_FLOOR,
};
