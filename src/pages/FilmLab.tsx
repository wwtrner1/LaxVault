import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadDrills } from "../lib/drills";
import { useDocsVersion } from "../lib/docSync";
import { useStore } from "../lib/store";
import { drillDiagram, STARTER_DRILLS, starterDrillScene, STARTER_PLAYS } from "../lib/starters";
import { SCENARIO_GROUPS, SCENARIOS, scenarioScene } from "../lib/starters/scenarios";
import { motionFor, readFor, type Read } from "../lib/filmLab";
import { clock } from "../lib/runPlay";
import { sportOf } from "../lib/fieldUnits";
import type { Scene } from "../lib/types";
import type { CameraKind, FilmStage, StageOptions } from "../lib/filmLab3d";
import "../styles/filmlab.css";

/**
 * Film Lab: any scenario, starter drill, drill or play stood up in 3D.
 * Cameras for every angle (behind the attack, wide, overhead, sideline, end
 * line, the goalie's and any player's eyes, the ball, free look), the Run
 * play clock to play, scrub and slow down, a "make the read" game that stops
 * before the last pass or shot, and Save as video. three.js loads with the
 * page (lib/filmLab3d.ts), never with the rest of the app.
 */

type Source = { id: string; name: string; group: string; scene: Scene; teach: string[] };

const SPEEDS = [0.5, 1, 2] as const;
const GAME: Record<string, string> = { mens_field: "Men's", womens_field: "Women's", box: "Box" };
const gameOf = (s: Scene) => GAME[sportOf(s.view) ?? "mens_field"] ?? "";

function useSources(): Source[] {
  const ver = useDocsVersion();
  const plays = useStore((s) => s.plays);
  return useMemo(() => {
    const byId = new Map([...STARTER_PLAYS, ...plays].map((p) => [p.id, p]));
    const out: Source[] = [];
    for (const g of SCENARIO_GROUPS)
      for (const s of SCENARIOS.filter((x) => x.group === g)) {
        const scene = scenarioScene(s);
        out.push({ id: `scenario:${s.key}`, name: `${s.name} (${gameOf(scene)})`, group: `Game scenarios · ${g}`, scene, teach: [s.hint] });
      }
    for (const d of STARTER_DRILLS) {
      out.push({ id: `drill:${d.key}`, name: d.name, group: "Starter drills", scene: starterDrillScene(d), teach: [d.setup, ...d.coachingPoints] });
    }
    for (const d of loadDrills()) {
      const dia = drillDiagram(d, byId);
      if (dia) out.push({ id: `mydrill:${d.id}`, name: d.name, group: "My drills", scene: dia.scene, teach: [d.setup, ...d.coachingPoints].filter(Boolean) });
    }
    for (const p of plays) if (!p.id.startsWith("starter-")) out.push({ id: `play:${p.id}`, name: p.name || "Untitled play", group: "My plays", scene: p.scene, teach: p.description ? [p.description] : [] });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver, plays]);
}

/** The source an address asks for: ?scenario=, ?drill= (a starter key or one of the coach's drills), ?play=. */
function fromParams(sources: Source[], q: URLSearchParams): Source | undefined {
  const s = q.get("scenario");
  const d = q.get("drill");
  const p = q.get("play");
  const want = s ? [`scenario:${s}`] : d ? [`drill:${d}`, `mydrill:${d}`] : p ? [`play:${p}`, `scenario:${p}`] : [];
  return sources.find((x) => want.includes(x.id));
}

export function FilmLab() {
  const sources = useSources();
  const [params, setParams] = useSearchParams();
  const source = fromParams(sources, params) ?? sources.find((s) => s.id === "scenario:m-3v2-break") ?? sources[0];
  const motion = useMemo(() => motionFor(source.scene), [source.scene]);
  const read = useMemo(() => (motion.framed ? null : readFor(source.scene, motion.tl)), [source.scene, motion]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<FilmStage | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState("");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [cam, setCam] = useState<CameraKind>("standard");
  const [who, setWho] = useState<string | null>(null);
  const [opts, setOpts] = useState<StageOptions>({ lines: true, labels: true });
  const [people, setPeople] = useState<ReturnType<FilmStage["players"]>>([]);
  const [cams, setCams] = useState<{ id: CameraKind; label: string; hint: string }[]>([]);
  const [game, setGame] = useState<{ on: boolean; asked: Read | null; picked: string | null; right: number; tries: number }>({ on: false, asked: null, picked: null, right: 0, tries: 0 });
  const [rec, setRec] = useState<"" | "on" | "saving">("");
  const [note, setNote] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const tRef = useRef(0);
  tRef.current = t;

  // three.js and the stage load with the page.
  useEffect(() => {
    let stage: FilmStage | null = null;
    let gone = false;
    import("../lib/filmLab3d")
      .then(({ FilmStage, CAMERAS }) => {
        if (gone || !canvasRef.current) return;
        try {
          stage = new FilmStage(canvasRef.current);
        } catch {
          setFailed("This browser can't draw 3D (WebGL is off or not supported). Run play in the Designer shows the same play flat.");
          return;
        }
        stageRef.current = stage;
        setCams(CAMERAS);
        setReady(true);
      })
      .catch(() => setFailed("Film Lab didn't load. Check the connection and reload the page."));
    return () => {
      gone = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, []);

  // Fit the canvas to its box.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !ready) return;
    const fit = () => stageRef.current?.resize(el.clientWidth, el.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // A new play: stand it up and start from the top.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let live = true;
    setPlaying(false);
    setT(0);
    void stage.load(source.scene, opts).then(() => {
      if (!live) return;
      const ps = stage.players();
      setPeople(ps);
      setWho((w) => (w && ps.some((p) => p.id === w) ? w : (ps.find((p) => p.side === "offense")?.id ?? ps[0]?.id ?? null)));
    });
    setGame((g) => ({ ...g, asked: null, picked: null }));
    return () => {
      live = false;
    };
    // Options are applied by their own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.scene, ready]);

  useEffect(() => void stageRef.current?.setOptions(opts), [opts]);
  useEffect(() => stageRef.current?.setCamera(cam, who), [cam, who, ready]);

  // Everyone where the clock says.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const spots = motion.spots(t);
    stage.setState({ spots, ball: motion.ball(t, spots) });
  }, [t, motion, ready]);

  // The clock.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      let next = tRef.current + dt;
      if (game.on && read && !game.asked && tRef.current < read.at && next >= read.at) {
        next = read.at;
        setPlaying(false);
        setGame((g) => ({ ...g, asked: read, picked: null }));
      }
      if (next >= motion.duration) {
        next = motion.duration;
        setPlaying(false);
      }
      setT(next);
      if (next < motion.duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, motion, game.on, game.asked, read]);

  // A recording ends with the play.
  useEffect(() => {
    if (rec === "on" && !playing && t >= motion.duration) recorder.current?.stop();
  }, [rec, playing, t, motion.duration]);

  const pick = useCallback(
    (id: string) => {
      const q = new URLSearchParams();
      const [kind, key] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
      q.set(kind === "scenario" ? "scenario" : kind === "play" ? "play" : "drill", key);
      setParams(q, { replace: true });
    },
    [setParams],
  );

  const playPause = () => {
    if (game.asked && !game.picked) return;
    if (t >= motion.duration) setT(0);
    setPlaying((p) => !p);
  };

  const answer = (id: string) => {
    if (!game.asked || game.picked) return;
    const right = id === game.asked.answer;
    setGame((g) => ({ ...g, picked: id, right: g.right + (right ? 1 : 0), tries: g.tries + 1 }));
    setPlaying(true);
  };

  /** The next rep: another play from the same game with a pass or shot to read. */
  const nextRep = () => {
    const pool = sources.filter((s) => s.id !== source.id && s.id.startsWith("scenario:") && sportOf(s.scene.view) === sportOf(source.scene.view));
    const fit = pool.filter((s) => {
      const m = motionFor(s.scene);
      return !m.framed && readFor(s.scene, m.tl);
    });
    const next = fit[Math.floor(Math.random() * fit.length)];
    setGame((g) => ({ ...g, asked: null, picked: null }));
    if (next) pick(next.id);
    setTimeout(() => setPlaying(true), 400);
  };

  // In the read game, the camera is the ball carrier's eyes.
  useEffect(() => {
    if (game.on && read?.passer) {
      setWho(read.passer);
      setCam("eyes");
    }
  }, [game.on, read]);

  const startGame = () => {
    setGame({ on: true, asked: null, picked: null, right: 0, tries: 0 });
    setT(0);
    setPlaying(true);
  };

  const record = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
      setNote("This browser can't save video. Chrome, Edge, Firefox and Safari 14.1+ can.");
      return;
    }
    const type = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const stream = canvas.captureStream(30);
    const r = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      setRec("saving");
      const blob = new Blob(chunks, { type: r.mimeType || "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${source.name.replace(/[^\w -]+/g, "").trim() || "play"} - LaxVault Film Lab.${/mp4/.test(r.mimeType) ? "mp4" : "webm"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setRec("");
      setNote("Video saved to your downloads.");
    };
    recorder.current = r;
    setGame((g) => ({ ...g, on: false, asked: null }));
    setT(0);
    setNote("");
    setRec("on");
    setSpeed(1);
    // A beat on the first frame so the camera settles.
    setTimeout(() => {
      r.start(250);
      setPlaying(true);
    }, 600);
  };

  // Keys: Space plays, arrows step through players, Escape leaves free look.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, select, textarea")) return;
      if (e.key === " ") {
        e.preventDefault();
        playPause();
      } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && people.length) {
        const i = people.findIndex((p) => p.id === who);
        const n = people[(i + (e.key === "ArrowRight" ? 1 : -1) + people.length) % people.length];
        setWho(n.id);
        setCam("eyes");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const downAt = useRef<{ x: number; y: number } | null>(null);
  const tap = (e: React.PointerEvent) => {
    const d = downAt.current;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    const id = stageRef.current?.pick(e.clientX, e.clientY);
    if (id) {
      setWho(id);
      setCam("eyes");
    }
  };

  const groups = useMemo(() => [...new Set(sources.map((s) => s.group))], [sources]);
  const whoName = people.find((p) => p.id === who)?.label ?? "";
  const camLabel = cams.find((c) => c.id === cam)?.label ?? "";

  return (
    <div className="fl">
      <header className="fl-top">
        <Link to="/drills" className="fl-back">← Drills</Link>
        <h1 className="fl-title">Film Lab</h1>
        <span className="fl-pill">3D</span>
        <label className="fl-src">
          <span className="sr-only">Play, drill or scenario</span>
          <select value={source.id} onChange={(e) => pick(e.target.value)} aria-label="Play, drill or scenario">
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {sources.filter((s) => s.group === g).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <span className="fl-pill fl-teach">Teaching model</span>
      </header>

      <div className="fl-body">
        <main className="fl-stage">
          <div className="fl-canvas" ref={wrapRef}>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              aria-label={`${source.name} in 3D. Space plays and pauses; the arrow keys pick a player.`}
              onPointerDown={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
              onPointerUp={tap}
            />
            {!ready && !failed && <div className="fl-load">Setting up the field…</div>}
            {failed && <div className="fl-load fl-fail" role="alert">{failed}</div>}
            <div className="fl-hud">
              <span className="fl-hud-v">{camLabel}{cam === "eyes" && whoName ? ` · ${whoName}` : ""}</span>
              {rec === "on" && <span className="fl-rec"><b />Recording</span>}
            </div>
            {game.on && (
              <div className="fl-game" role="region" aria-label="Make the read">
                <div className="fl-k">Make the read · {game.right}/{game.tries}</div>
                {!read && <p>This one has no pass or shot to read. <button type="button" className="fl-link" onClick={nextRep}>Next rep</button></p>}
                {read && !game.asked && <p>Watch the play. It stops right before the ball moves.</p>}
                {game.asked && (
                  <>
                    <h3>{game.asked.question}</h3>
                    <div className="fl-opts">
                      {game.asked.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          className={game.picked ? (o.id === game.asked!.answer ? "is-right" : o.id === game.picked ? "is-wrong" : "") : ""}
                          onClick={() => answer(o.id)}
                          disabled={!!game.picked}
                        >
                          {o.text}
                        </button>
                      ))}
                    </div>
                    {game.picked && (
                      <p role="status">
                        <b>{game.picked === game.asked.answer ? "Right read." : "Not this time."}</b> {game.asked.why}{" "}
                        <button type="button" className="fl-link" onClick={nextRep}>Next rep →</button>
                      </p>
                    )}
                  </>
                )}
                <button type="button" className="fl-x" onClick={() => setGame((g) => ({ ...g, on: false, asked: null }))} aria-label="Stop the read game">×</button>
              </div>
            )}
          </div>
          <div className="fl-bar">
            <button type="button" className="fl-play" onClick={playPause} aria-label={playing ? "Pause" : "Play"} disabled={!ready || rec === "on"}>
              {playing ? "❚❚ Pause" : t >= motion.duration ? "↻ Replay" : "▶ Play"}
            </button>
            <div className="fl-scrub">
              <input
                type="range"
                min={0}
                max={motion.duration}
                step={0.01}
                value={t}
                onChange={(e) => (setPlaying(false), setT(Number(e.target.value)))}
                aria-label="Play clock"
                disabled={rec === "on"}
              />
              <div className="fl-marks" aria-hidden="true">
                {motion.marks.map((m, i) => <i key={i} style={{ left: `${(m / motion.duration) * 100}%` }} />)}
              </div>
            </div>
            <span className="fl-time">{clock(t)}.{String(Math.floor((t % 1) * 10))}</span>
            <div className="fl-seg" role="group" aria-label="Speed">
              {SPEEDS.map((s) => (
                <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)} disabled={rec === "on"}>{s}×</button>
              ))}
            </div>
          </div>
        </main>

        <aside className="fl-side">
          <section>
            <div className="fl-k">Camera</div>
            <div className="fl-grid">
              {cams.map((c) => (
                <button key={c.id} type="button" aria-pressed={cam === c.id} title={c.hint} onClick={() => setCam(c.id)}>{c.label}</button>
              ))}
            </div>
          </section>
          <section>
            <div className="fl-k">See it from any player</div>
            <div className="fl-chips">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={p.side === "defense" ? "is-d" : ""}
                  style={{ ["--chip" as string]: p.fill }}
                  aria-pressed={cam === "eyes" && who === p.id}
                  aria-label={`See it from ${p.side === "defense" ? "defender" : "player"} ${p.label}`}
                  onClick={() => (setWho(p.id), setCam("eyes"))}
                >
                  {p.label || "•"}
                </button>
              ))}
            </div>
            <p className="fl-hint">Or tap a player on the field. ← → step through them.</p>
          </section>
          <section>
            <div className="fl-k">Show</div>
            <label className="fl-tg"><input type="checkbox" checked={opts.lines} onChange={(e) => setOpts({ ...opts, lines: e.target.checked })} /> Lines on the grass</label>
            <label className="fl-tg"><input type="checkbox" checked={opts.labels} onChange={(e) => setOpts({ ...opts, labels: e.target.checked })} /> Letters over players</label>
          </section>
          <section>
            <div className="fl-k">Game mode</div>
            <button type="button" className="fl-cta" onClick={startGame} disabled={!ready || rec === "on"}>Make the read</button>
            <p className="fl-hint">The play stops before the last pass or shot. Call where the ball goes.</p>
          </section>
          <section>
            <div className="fl-k">Share it</div>
            <button type="button" className="fl-ghost" onClick={record} disabled={!ready || rec !== ""}>{rec === "on" ? "Recording the play…" : "Save as video"}</button>
            <p className="fl-hint" role="status">{note || "Plays it once at full speed on this camera and saves a video for the team chat."}</p>
          </section>
          <section className="fl-teachbox">
            <div className="fl-k">What it teaches</div>
            <h2>{source.name}</h2>
            {source.teach.slice(0, 1).map((x, i) => <p key={i}>{x}</p>)}
            {source.teach.length > 1 && <ul>{source.teach.slice(1).map((x, i) => <li key={i}>{x}</li>)}</ul>}
            <Link className="fl-link" to={source.id.startsWith("play:") ? `/build/${source.id.slice(5)}` : "/build"}>Open the Designer</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
