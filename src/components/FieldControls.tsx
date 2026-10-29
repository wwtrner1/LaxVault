import { useEffect, useRef } from "react";
import { CONTRASTS, GRID_SIZES, HASHES, SNAP_RADII, fieldPrefsStore, useFieldPrefs } from "../lib/fieldPrefs";
import { Icon } from "./Icon";

type Props = {
  /** Snap lines to players (the drawing bar's Snap, S). */
  snapPlayers: boolean;
  onSnapPlayers: () => void;
  onClose: () => void;
};

/** One row of choices: a label and chips, one of them on. */
function Choice<T extends string | number>({ label, value, options, onPick }: { label: string; value: T; options: { value: T; label: string; hint?: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="fc-row" role="radiogroup" aria-label={label}>
      <span className="fc-label">{label}</span>
      <div className="chip-row">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={`chip${o.value === value ? " is-on" : ""}`}
            title={o.hint}
            onClick={() => onPick(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Field Controls: every setting for how the field looks and how drawing snaps,
 * in one panel above the field. Remembered in this browser; the field markings
 * and rule lines print the same way they show here.
 */
export function FieldControls({ snapPlayers, onSnapPlayers, onClose }: Props) {
  const prefs = useFieldPrefs();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      back?.focus?.();
    };
  }, [onClose]);

  return (
    <>
      <div className="stage-menu-scrim" onPointerDown={onClose} aria-hidden="true" />
      <div className="fc-panel" id="field-controls" role="dialog" aria-labelledby="fc-title" ref={panel}>
        <div className="fc-head">
          <h2 id="fc-title">Field controls</h2>
          <button type="button" className="fc-close" onClick={onClose} aria-label="Close field controls">
            <Icon name="close" size={14} />
          </button>
        </div>

        <p className="fc-section">Drawing</p>
        <Choice label="Snap to grid" value={prefs.grid} options={GRID_SIZES} onPick={(grid) => fieldPrefsStore.set({ grid })} />
        <label className="switch fc-switch">
          <input type="checkbox" checked={snapPlayers} onChange={onSnapPlayers} />
          Snap lines to players
        </label>
        {snapPlayers && (
          <Choice label="Snap radius" value={prefs.snapRadius} options={SNAP_RADII} onPick={(snapRadius) => fieldPrefsStore.set({ snapRadius })} />
        )}

        <p className="fc-section">Field markings</p>
        <Choice
          label="Hash marks"
          value={prefs.hashes}
          options={HASHES.map((h) => ({ value: h.id, label: h.label, hint: h.hint }))}
          onPick={(hashes) => fieldPrefsStore.set({ hashes })}
        />
        <Choice
          label="Yard lines"
          value={prefs.contrast}
          options={CONTRASTS.map((c) => ({ value: c.id, label: c.label, hint: c.hint }))}
          onPick={(contrast) => fieldPrefsStore.set({ contrast })}
        />

        <p className="fc-foot">
          Saved in this browser. Hash marks and yard lines print the way you see them. The grid never prints.
        </p>
      </div>
    </>
  );
}
