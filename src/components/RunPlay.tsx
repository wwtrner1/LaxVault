import { useEffect, useMemo, useRef, useState } from "react";
import { buildTimeline, clock, isFilmLink, linkAt, linkStart, parseClock, stepAt, youtubeEmbed, youtubeId } from "../lib/runPlay";
import type { Scene } from "../lib/types";
import { frameMotion, frameName, frameScene, isFramed, motionAt } from "../lib/frames";
import { FieldBackground } from "../lib/field";
import { drawOrder, MarkerDefs, NodeLayer, strokeColors } from "../lib/render";
import { CANVAS_H, CANVAS_W } from "../lib/types";
import { Icon } from "./Icon";
import { RunField } from "./RunField";

const SPEEDS = [0.5, 1, 2] as const;

/**
 * Run play with video: the play animates step by step (lib/runPlay.ts), the
 * timeline marks each step, "Stop after each step" pauses at the end of one so
 * the coach can talk it through, and a clip can run in time with it once the
 * coach marks the start. A YouTube link plays right here; a Hudl link opens in
 * a new tab. Running a play never changes the saved diagram.
 */
export function RunPlay({
  scene,
  name,
  onFilm,
  onClose,
}: {
  scene: Scene;
  name: string;
  /** Saves the film link and snap mark onto the play. */
  onFilm: (film: Scene["film"]) => void;
  onClose: () => void;
}) {
  // A multi-frame play runs frame to frame, each frame one step of the clock; a one-frame play runs its lines in steps.
  const motion = useMemo(() => (isFramed(scene) ? frameMotion(scene) : null), [scene]);
  const tl = useMemo(() => {
    const single = buildTimeline(scene);
    if (!motion) return single;
    const steps = motion.marks.map((m, i) => ({ n: i + 1, start: m.at, end: motion.marks[i + 1]?.at ?? motion.duration }));
    return { ...single, steps, duration: motion.duration };
  }, [scene, motion]);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [stepwise, setStepwise] = useState(() => tl.steps.length > 1);
  /** Where the clock stops next when going step by step. */
  const stopRef = useRef<number>(Infinity);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [sync, setSync] = useState(true);
  const [linkDraft, setLinkDraft] = useState(scene.film?.link ?? "");
  const [linkError, setLinkError] = useState("");
  const snapAt = scene.film?.snapAt ?? 0;
  const video = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tRef = useRef(0);
  tRef.current = t;

  // Free the local clip when leaving.
  useEffect(() => () => void (videoUrl && URL.revokeObjectURL(videoUrl)), [videoUrl]);

  // Escape goes back to drawing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The clock: the drawing leads, the clip follows when synced.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const next = tRef.current + ((now - last) / 1000) * speed;
      last = now;
      if (next >= stopRef.current && stopRef.current < tl.duration) {
        setT(stopRef.current);
        setPlaying(false);
        video.current?.pause();
        return;
      }
      if (next >= tl.duration) {
        setT(tl.duration);
        setPlaying(false);
        video.current?.pause();
        return;
      }
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, tl.duration]);

  const linked = sync && videoUrl && video.current;
  const seekVideo = (time: number) => {
    if (linked) video.current!.currentTime = Math.max(0, snapAt + time);
  };

  /** The end of the step running at `time`, where step-by-step play stops. */
  const stepEnd = (time: number) => tl.steps.find((s) => s.end > time + 0.01)?.end ?? tl.duration;
  const run = (from = t) => {
    const start = from >= tl.duration - 0.01 ? 0 : from;
    stopRef.current = stepwise ? stepEnd(start) : Infinity;
    setT(start);
    if (linked) {
      video.current!.playbackRate = speed;
      seekVideo(start);
      void video.current!.play();
    }
    setPlaying(true);
  };
  const pause = () => {
    setPlaying(false);
    video.current?.pause();
  };

  const now = stepAt(tl, t);
  const goStep = (n: number) => {
    const s = tl.steps.find((x) => x.n === n);
    if (!s) return;
    pause();
    setT(s.start);
    seekVideo(s.start);
  };
  const idx = tl.steps.findIndex((s) => s.n === now);
  const yt = scene.film?.link ? youtubeId(scene.film.link) : null;
  const ytStart = snapAt || (scene.film?.link ? linkStart(scene.film.link) : 0);

  const attach = (file: File) => {
    if (!file.type.startsWith("video/")) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
  };
  const saveLink = () => {
    const v = linkDraft.trim();
    if (v && !isFilmLink(v)) return setLinkError("Paste a Hudl or YouTube link that starts with https://.");
    setLinkError("");
    onFilm({ ...scene.film, link: v || undefined });
  };

  return (
    <div className="rp" role="dialog" aria-modal="true" aria-labelledby="rp-h">
      <header className="rp-top">
        <h2 id="rp-h">
          Run play <span>{name || "Untitled play"}</span>
        </h2>
        <button type="button" className="btn btn-outline-dark btn-sm" onClick={onClose}>
          Back to drawing
        </button>
      </header>

      <div className="rp-body">
        <div className="rp-left">
          <div className="rp-field">
            {motion ? (
              <FrameField scene={scene} motion={motion} t={t} label={`${name || "Play"} running, frame ${now} of ${tl.steps.length}, ${t.toFixed(1)} seconds in`} />
            ) : (
              <RunField scene={scene} tl={tl} t={t} label={`${name || "Play"} running, step ${now} of ${tl.steps.length || 1}, ${t.toFixed(1)} seconds in`} />
            )}
            {motion && (
              <span className="rp-frame" aria-live="polite">
                {now}/{tl.steps.length} {frameName(scene.frames?.[now - 1], now - 1)}
              </span>
            )}
            <span className="rp-clock">
              {tl.steps.length > 1 ? `${motion ? "FRAME" : "STEP"} ${now} OF ${tl.steps.length} · ` : ""}
              {t.toFixed(1)} S · {speed}X
            </span>
          </div>

          <div className="rp-bar">
            {playing ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={pause}>
                Pause
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => run()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 5v14l12-7z" />
                </svg>
                {t >= tl.duration - 0.01 ? "Run again" : t > 0 ? (stepwise && tl.steps.length > 1 ? `Run step ${tl.steps[Math.max(0, tl.steps.findIndex((s) => s.end > t + 0.01))]?.n ?? 1}` : "Keep running") : "Run play"}
              </button>
            )}
            {tl.steps.length > 1 && (
              <div className="rp-steps" role="group" aria-label={motion ? "Frames" : "Steps"}>
                <button type="button" onClick={() => goStep(tl.steps[Math.max(0, idx - (t > (tl.steps[idx]?.start ?? 0) + 0.05 ? 0 : 1))].n)} aria-label={motion ? "Back a frame" : "Back a step"}>
                  ‹ {motion ? "Frame" : "Step"}
                </button>
                <button type="button" onClick={() => idx + 1 < tl.steps.length && goStep(tl.steps[idx + 1].n)} disabled={idx + 1 >= tl.steps.length} aria-label={motion ? "Forward a frame" : "Forward a step"}>
                  {motion ? "Frame" : "Step"} ›
                </button>
              </div>
            )}
            <div className="rp-speed" role="group" aria-label="Speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={speed === s ? "is-on" : ""}
                  aria-pressed={speed === s}
                  onClick={() => {
                    setSpeed(s);
                    if (video.current) video.current.playbackRate = s;
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
            <div className="rp-time">
              <input
                type="range"
                min={0}
                max={tl.duration}
                step={0.01}
                value={t}
                aria-label="Time into the play"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setT(v);
                  seekVideo(v);
                }}
              />
              {tl.steps.length > 1 ? (
                tl.steps.map((s) => (
                  <span key={s.n} className="rp-mark" style={{ left: `${(s.start / tl.duration) * 100}%` }}>
                    {s.n}
                  </span>
                ))
              ) : (
                <span className="rp-mark" style={{ left: "0%" }}>
                  START
                </span>
              )}
              <span className="rp-mark is-end">{tl.duration.toFixed(1)} S</span>
            </div>
            {tl.steps.length > 1 && (
              <label className="rp-sync">
                <input type="checkbox" checked={stepwise} onChange={(e) => setStepwise(e.target.checked)} /> Stop after each {motion ? "frame" : "step"}
              </label>
            )}
            <label className="rp-sync">
              <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} disabled={!videoUrl} /> Sync to video
            </label>
          </div>
          {motion ? (
            <p className="rp-note">
              {motion.steps.some((st) => st.tracks.length > 0)
                ? "Each frame holds, then everyone moves to the next: players along their cuts, the ball along its pass or with its carrier."
                : "Nobody moves between frames yet. Move players in a later frame, or draw cuts in an earlier one."}
            </p>
          ) : tl.tracks.length === 0 && tl.legs.length === 0 ? (
            <p className="rp-note">Nobody moves yet. Draw cuts and passes from the players, then run the play.</p>
          ) : (
            <p className="rp-note">
              Cuts, dodges and picks move the player they start on; a pass (dashed) moves the ball to the nearest teammate, and a shot (a solid line set to move the ball) lands where it ends. A line that starts where another ends runs a step later. Set a line's step or what it moves under Selection → Run play.
            </p>
          )}
        </div>

        <div className="rp-right">
          <div className="rp-video">
            {videoUrl ? (
              // A clip from the coach's own computer; it has no captions to offer.
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video ref={video} src={videoUrl} controls playsInline aria-label={`Clip: ${videoName}`} />
            ) : yt ? (
              <iframe
                key={`${yt}-${ytStart}`}
                src={youtubeEmbed(yt, ytStart)}
                title={`Film for ${name || "this play"}`}
                allow="encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <button type="button" className="rp-empty" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={22} />
                <span>Attach a practice or game clip from this computer</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => (e.target.files?.[0] && attach(e.target.files[0]), (e.target.value = ""))} />
          <div className="rp-acts">
            <button type="button" className="btn btn-outline-dark" onClick={() => fileRef.current?.click()}>
              {videoUrl ? "Attach a different video" : "Attach video"}
            </button>
            {videoUrl && (
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={() => {
                  const s = video.current?.currentTime ?? 0;
                  onFilm({ ...scene.film, snapAt: Math.round(s * 10) / 10 });
                }}
              >
                Mark the snap here
              </button>
            )}
          </div>
          <p className="rp-note">
            {videoUrl
              ? snapAt
                ? `Start marked at ${snapAt.toFixed(1)} s. Run the play and the clip plays in time with the drawing.`
                : "Play the clip to where the play starts, pause, and press Mark the start here."
              : "Mark the start once and the clip plays in time with the drawing. Running a play never changes the saved diagram — prints still show the static play."}
            {videoUrl && " Clips stay on this computer; attach it again next time."}
          </p>

          <label className="rp-link">
            <span>Hudl or YouTube link</span>
            <input
              className="input"
              type="url"
              placeholder="https://www.hudl.com/… or https://youtu.be/…"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onBlur={saveLink}
            />
          </label>
          {linkError && (
            <p className="rp-error" role="alert">
              {linkError}
            </p>
          )}
          {scene.film?.link && !linkError && (
            <label className="rp-link">
              <span>The play starts at (m:ss)</span>
              <input
                className="input"
                key={snapAt}
                inputMode="numeric"
                placeholder="1:23"
                defaultValue={snapAt ? clock(snapAt) : ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const secs = v ? parseClock(v) : 0;
                  if (secs !== null) onFilm({ ...scene.film, snapAt: secs || undefined });
                }}
              />
            </label>
          )}
          {scene.film?.link && !linkError && (
            <a className="rp-open" href={linkAt(scene.film.link, snapAt)} target="_blank" rel="noopener noreferrer">
              Open the film{snapAt ? ` at the start (${clock(snapAt)})` : ""} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** A multi-frame play in motion: the lines of the frame on screen, players where they are at time t. */
function FrameField({ scene, motion, t, label }: { scene: Scene; motion: ReturnType<typeof frameMotion>; t: number; label: string }) {
  const now = motionAt(scene, motion, t);
  const shown = frameScene(scene, now.frame);
  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} role="img" aria-label={label}>
      <MarkerDefs colors={strokeColors(shown.nodes)} />
      <FieldBackground view={scene.view} losY={scene.losY} />
      {drawOrder(shown.nodes).map((n) => {
        if (n.kind !== "player") return <NodeLayer key={n.id} node={n} opacity={0.4} />;
        const p = now.spots.get(n.id) ?? n;
        return <NodeLayer key={n.id} node={{ ...n, x: p.x, y: p.y }} />;
      })}
    </svg>
  );
}
