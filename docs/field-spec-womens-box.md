# Women's field and box lacrosse: field specs

Added 2026-11-01 at Wes's request. The numbers live in `src/lib/fieldSpec.ts` (`WOMENS_FIELD`, `BOX_FLOOR`), each with its source; `src/lib/laxField.tsx` draws them and `LAX_GEOM` in `src/lib/fieldUnits.ts` places them on the canvas (views `wlax_half`, `wlax_full`, `box_half`, `box_full`).

Status: **draft**. Both specs come from primary rule documents, but no women's or box coach has checked the drawings yet.

## Women's field (USA Lacrosse, How to line a women's field, 2021)

| Marking | Drawn | Rule range / note |
| --- | --- | --- |
| Length, end line to end line | 120 yd | 110 to 140; 120 optimum |
| Width | 65 yd | 60 to 70; 65 optimum |
| Goal line from end line | 10 yd | 10 to 20; goal lines 90 to 100 yd apart |
| Goal circle radius | 8.5 ft (2.6 m) | to the outside of the line |
| 8-meter arc | 10.6 m from the centre of the goal line | hash marks at centre and 4, 8, 12 m either side; two on the extended goal line |
| 12-meter fan | 14.6 m from the centre of the goal line | drawn dashed |
| Restraining line | 30 yd from each goal line | full width |
| Center circle | 30 ft radius | |
| Center (draw) line | 3 m | through the circle's centre |
| Dots below the goal | 5 yd behind the 8 m marks on the extended goal line | |
| Goal | 6 x 6 ft | secondary source |

Open questions: the arc and fan are drawn as half circles meeting the extended goal line; youth fields are not drawn.

## Box floor (World Lacrosse Box Rule Book 2026-28, Rule 1; NLL Rule Book 2019-20)

| Marking | Drawn | Source / note |
| --- | --- | --- |
| Floor | 200 x 85 ft | width from NLL 6.1 (centre spot 42.5 ft from each side); length is typical arena size, not in either rule book's text |
| Corners | 28 ft radius | hockey rink standard, not from the rule books |
| Goal line from end boards | 12 ft | WL 1.2.1, NLL 2.1 |
| Goal | 4 ft 9 in wide, 4 ft high | WL 1.2, NLL 2.1 |
| Crease | 9 ft 3 in radius, cut off 1 ft behind the goal line | WL 1.1.7, NLL 3.1 |
| Restraining lines | 42 ft 6 in from the centre line | WL 1.1.5, NLL 1.5 |
| Face-off circle | 11 ft radius, dotted inner circle 17 in | WL 1.1.9, NLL 6.1 |
| Corner face-off spots | 5 yd from the boards, 5 yd inside the restraining lines | WL 1.1.9 (NLL measures from attack lines) |

Not drawn: bench and penalty-box gates, change area.

## Sources

- https://www.usalacrosse.com/sites/default/files/documents/Rules/how-to-line-womens-field-2021.pdf
- https://worldlacrosse.sport/wp-content/uploads/2026/05/26-28-Box-Rule-Book_v2_0526.pdf
- https://nll.com/wp-content/uploads/2020/11/NLL-2019-20-Rulebook-FINAL.pdf
