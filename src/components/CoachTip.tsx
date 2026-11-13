import { useEffect } from "react";
import { coachTips, useCoachTip } from "../lib/coachTips";

/**
 * The coach-tip bubble: says why the last few taps didn't do anything and
 * what to do instead. It never blocks the field and clears itself.
 */
export function CoachTip() {
  const tip = useCoachTip();

  useEffect(() => {
    if (!tip) return;
    const t = window.setTimeout(() => coachTips.dismiss(), 9000);
    // The moment the coach touches the field again the tip steps aside, so it never sits between a finger and a player.
    const onField = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.(".builder-stage, .dz-dock, .dz-gobar")) coachTips.dismiss();
    };
    window.addEventListener("pointerdown", onField, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", onField, true);
    };
  }, [tip]);

  if (!tip) return null;
  return (
    <div className="coach-tip" role="status" aria-live="polite">
      <p className="coach-tip-title">{tip.title}</p>
      <p className="coach-tip-text">{tip.text}</p>
      <div className="coach-tip-acts">
        {tip.action && (
          <button
            type="button"
            className="coach-tip-btn is-primary"
            onClick={() => {
              tip.action!.run();
              coachTips.dismiss();
            }}
          >
            {tip.action.label}
          </button>
        )}
        <button type="button" className="coach-tip-btn" onClick={() => coachTips.dismiss()}>
          Got it
        </button>
        <button type="button" className="coach-tip-off" onClick={() => coachTips.setEnabled(false)}>
          Turn off tips
        </button>
      </div>
    </div>
  );
}
