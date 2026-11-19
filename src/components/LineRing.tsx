import { GO_KINDS, type GoKind } from "../lib/goLine";
import { ringSpots } from "../lib/lineRing";
import { LineGlyph } from "./LineGlyph";

/**
 * The line ring: the line kinds fanned out around a tapped player, in screen
 * pixels over the field. Press a kind to drop its line; keep pressing and drag
 * to pull the line's end where it goes. Portable: it only needs the player's
 * spot on screen and the size of the field box.
 */
export function LineRing({
  center,
  box,
  name,
  compact,
  onPick,
}: {
  center: { x: number; y: number };
  box: { w: number; h: number };
  name: string;
  compact: boolean;
  onPick: (kind: GoKind, e: React.PointerEvent) => void;
}) {
  const radius = compact ? 54 : 64;
  const { cx, cy, spots } = ringSpots(GO_KINDS.length, radius, center, box);
  return (
    <div className={`line-ring${compact ? " is-compact" : ""}`} role="menu" aria-label={`Lines for ${name}`} style={{ left: cx, top: cy }}>
      <span className="line-ring-disc" style={{ width: radius * 2 + 8, height: radius * 2 + 8 }} aria-hidden="true" />
      {GO_KINDS.map((k, i) => {
        const s = spots[i];
        return (
          <button
            key={k.id}
            type="button"
            role="menuitem"
            className="line-ring-btn"
            style={{ left: s.x - cx, top: s.y - cy }}
            title={k.hint}
            aria-label={`${k.label}: ${k.hint}`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPick(k.id, e);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(k.id, e as unknown as React.PointerEvent);
              }
            }}
          >
            <LineGlyph kind={k.id} size={compact ? 22 : 26} />
            <span className="line-ring-label">{k.label}</span>
          </button>
        );
      })}
    </div>
  );
}
