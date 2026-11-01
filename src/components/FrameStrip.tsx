import { addFrame, deleteFrame, duplicateFrame, FRAME_LIMIT, frameCount, frameName, goFrame, moveFrame, patchFrame } from "../lib/frames";
import type { Scene } from "../lib/types";

/**
 * The Designer's frame strip, under the field: pick a frame to edit, add the
 * next phase (players run to the end of their cuts), name it, say what to
 * teach, reorder, copy or delete it, and play the frames through.
 */
export function FrameStrip({
  scene,
  onScene,
  onFrame,
  onPlay,
  onStatus,
}: {
  /** The Designer's working scene (a frame view when the play has frames). */
  scene: Scene;
  onScene: (next: Scene, label?: string) => void;
  /** Called after the open frame changes, so the Designer can drop a selection that isn't on screen. */
  onFrame: () => void;
  onPlay: () => void;
  onStatus: (text: string) => void;
}) {
  const n = frameCount(scene);
  const at = scene.frameAt ?? 0;
  const frame = scene.frames?.[at];
  const framed = n > 1;

  const go = (j: number) => {
    if (j === at || j < 0 || j >= n) return;
    onScene(goFrame(scene, j));
    onFrame();
    onStatus(`Editing ${frameName(scene.frames?.[j], j)}. Drag players to where they stand in this phase.`);
  };
  const add = () => {
    const next = addFrame(scene);
    if ("error" in next) return onStatus(next.error);
    onScene(next, `Add frame ${at + 2}`);
    onFrame();
    onStatus(`Frame ${at + 2} added. Players moved to the end of their cuts; draw the next phase.`);
  };
  const copy = () => {
    const next = duplicateFrame(scene);
    if ("error" in next) return onStatus(next.error);
    onScene(next, "Copy frame");
    onFrame();
  };
  const remove = () => {
    onScene(deleteFrame(scene), `Delete ${frameName(frame, at)}`);
    onFrame();
    onStatus(`Deleted ${frameName(frame, at)} and its lines. Undo brings it back.`);
  };
  const move = (dir: -1 | 1) => {
    onScene(moveFrame(scene, dir), "Move frame");
    onFrame();
  };

  // Arrow keys step through the frame buttons (roving focus inside the group).
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const j = at + (e.key === "ArrowRight" ? 1 : -1);
    go(j);
    window.setTimeout(() => document.querySelector<HTMLButtonElement>(`.dz-frames [data-frame="${j}"]`)?.focus(), 0);
  };

  return (
    <section className={`dz-frames${framed ? " is-framed" : ""}`} aria-label="Frames" data-tour="frames">
      <div className="dz-frames-row">
        <span className="dz-frames-h">Frames</span>
        <div className="dz-frames-list" role="group" aria-label="Pick a frame to edit" onKeyDown={onKey}>
          {Array.from({ length: n }, (_, i) => (
            <button
              key={scene.frames?.[i]?.id ?? i}
              type="button"
              data-frame={i}
              className={`dz-frame${i === at ? " is-on" : ""}`}
              aria-pressed={i === at}
              tabIndex={i === at ? 0 : -1}
              title={frameName(scene.frames?.[i], i)}
              onClick={() => go(i)}
            >
              <b>{i + 1}</b>
              {framed && scene.frames?.[i]?.label.trim() ? <span>{scene.frames[i].label.trim()}</span> : null}
            </button>
          ))}
        </div>
        <button type="button" className="dz-frames-add" onClick={add} disabled={n >= FRAME_LIMIT}>
          + Add frame
        </button>
        {framed ? (
          <>
            <button type="button" className="dz-frames-btn" onClick={() => move(-1)} disabled={at === 0} aria-label="Move this frame earlier">
              ◀
            </button>
            <button type="button" className="dz-frames-btn" onClick={() => move(1)} disabled={at === n - 1} aria-label="Move this frame later">
              ▶
            </button>
            <button type="button" className="dz-frames-btn" onClick={copy} disabled={n >= FRAME_LIMIT}>
              Copy
            </button>
            <button type="button" className="dz-frames-btn is-danger" onClick={remove}>
              Delete
            </button>
            <button type="button" className="dz-frames-play" onClick={onPlay}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 5v14l12-7z" />
              </svg>
              Play frames
            </button>
          </>
        ) : (
          <span className="dz-frames-hint">Teach it in phases: add a frame and players move to the end of their cuts.</span>
        )}
      </div>
      {framed && frame && (
        <div className="dz-frames-row dz-frames-edit">
          <label>
            <span>Frame {at + 1} name</span>
            <input
              className="input"
              value={frame.label}
              maxLength={40}
              placeholder={at === 0 ? "Entry" : "Skip to X"}
              onChange={(e) => onScene(patchFrame(scene, { label: e.target.value }))}
            />
          </label>
          <label className="is-wide">
            <span>What to teach</span>
            <input
              className="input"
              value={frame.note ?? ""}
              maxLength={240}
              placeholder="Prints under this frame"
              onChange={(e) => onScene(patchFrame(scene, { note: e.target.value || undefined }))}
            />
          </label>
        </div>
      )}
    </section>
  );
}
