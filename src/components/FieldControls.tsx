import { useEffect, useRef } from "react";
import { CONTRASTS, GRID_SIZES, SNAP_RADII, SURFACES, fieldPrefsStore, useFieldPrefs } from "../lib/fieldPrefs";
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

        <p className="fc-section">Look</p>
        <Choice label="Surface" value={prefs.surface} options={SURFACES.map((x) => ({ value: x.id, label: x.label, hint: x.hint }))} onPick={(surface) => fieldPrefsStore.set({ surface })} />
        <Choice label="Line contrast" value={prefs.contrast} options={CONTRASTS.map((x) => ({ value: x.id, label: x.label, hint: x.hint }))} onPick={(contrast) => fieldPrefsStore.set({ contrast })} />
        <label className="switch fc-switch">
          <input type="checkbox" checked={prefs.logo} onChange={() => fieldPrefsStore.set({ logo: !prefs.logo })} />
          Team logo at midfield (add one under Account → Your team)
        </label>

        <p className="fc-section">Drawing</p>
        <Choice label="Snap to grid" value={prefs.grid} options={GRID_SIZES} onPick={(grid) => fieldPrefsStore.set({ grid })} />
        <label className="switch fc-switch">
          <input type="checkbox" checked={snapPlayers} onChange={onSnapPlayers} />
          Snap lines to players
        </label>
        {snapPlayers && (
          <Choice label="Snap radius" value={prefs.snapRadius} options={SNAP_RADII} onPick={(snapRadius) => fieldPrefsStore.set({ snapRadius })} />
        )}


        <p className="fc-foot">
          Saved in this browser. The grid never prints. Light print cards always print on white to save ink; full-field images use the surface you pick here.
        </p>
      </div>
    </>
  );
}
