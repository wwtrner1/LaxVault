import { goKind, type GoKind } from "../lib/goLine";

/** A small drawing of a line kind (cut, pass, dodge…), the same look as the line it draws. */
export function LineGlyph({ kind, angle = 0, size = 28 }: { kind: GoKind; angle?: number; size?: number }) {
  const k = goKind(kind);
  const ink = k.stroke ?? "currentColor";
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} aria-hidden="true" style={{ transform: `rotate(${angle}deg)` }}>
      <path
        d={k.style === "motion" ? "M3 14 q2.5 -5 5 0 t5 0 t5 0" : "M3 14 H20"}
        fill="none"
        stroke={ink}
        strokeWidth={k.id === "shot" ? 3 : 2.3}
        strokeLinecap="round"
        strokeDasharray={k.style === "dashed" ? "3.6 3" : undefined}
      />
      {k.end === "tee" ? <path d="M21.5 7.5 V20.5" stroke={ink} strokeWidth={2.8} strokeLinecap="round" /> : <path d="M19 8.5 L26 14 L19 19.5 Z" fill={ink} />}
    </svg>
  );
}
