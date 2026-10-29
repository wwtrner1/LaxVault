import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PlayThumb } from "../components/PlayThumb";
import { loadDrills } from "../lib/drills";
import { addTime, clock, goTo, loadLive, pause, play, saveLive, secondsLeft, startState, type LiveState } from "../lib/live";
import { clockTimes, loadScript } from "../lib/practice";
import { useStore } from "../lib/store";
import { useDocsVersion } from "../lib/docSync";
import "../styles/live.css";

/**
 * Live practice mode: the script on the field. One big clock for the current
 * period, its drills with setup and coaching points, the diagram, and what's
 * next. Light palette (H) and large targets so it reads in sun with a glove on.
 * Reads the practice script and drills; never changes them.
 */
export function LivePractice() {
  const ver = useDocsVersion();
  const script = useMemo(loadScript, [ver]);
  const drills = useMemo(loadDrills, [ver]);
  const plays = useStore((s) => s.plays);
  const playById = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const drillById = useMemo(() => new Map(drills.map((d) => [d.id, d])), [drills]);
  const periods = script.periods;
  const ids = periods.map((p) => p.id);
  const times = clockTimes(script);

  const [live, setLive] = useState<LiveState | null>(() => (periods.length ? loadLive(ids) ?? startState(ids, periods[0].minutes) : null));
  const [now, setNow] = useState(Date.now);
  const [pick, setPick] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const buzzed = useRef(false);

  // A newer script from another device: carry on if it's the same periods, otherwise start it fresh.
  useEffect(() => {
    if (!ver || !live || live.periodIds.join() === ids.join()) return;
    setLive(periods.length ? loadLive(ids) ?? startState(ids, periods[0].minutes) : null);
  }, [ver]);

  const change = (next: LiveState) => {
    setLive(next);
    saveLive(next);
  };

  const running = live?.endsAt != null;
  const left = live ? secondsLeft(live, now) : 0;

  // Tick while running.
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [running]);

  // Keep the screen on while the clock runs.
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const ask = () => {
      if (document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => (lock = l), () => {});
    };
    ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      document.removeEventListener("visibilitychange", ask);
      lock?.release().catch(() => {});
    };
  }, [running]);

  // Horn and buzz once when the period runs out.
  useEffect(() => {
    if (!running) return;
    if (left > 0) {
      buzzed.current = false;
      return;
    }
    if (buzzed.current) return;
    buzzed.current = true;
    navigator.vibrate?.([300, 120, 300]);
    const ctx = audio.current;
    if (ctx) {
      [0, 0.45].forEach((at) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = 520;
        g.gain.setValueAtTime(0.25, ctx.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.38);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + at);
        o.stop(ctx.currentTime + at + 0.4);
      });
    }
  }, [left, running]);

  const toggle = () => {
    if (!live) return;
    // The horn needs a tap before the browser lets it play.
    if (!audio.current && typeof AudioContext !== "undefined") audio.current = new AudioContext();
    const t = Date.now();
    setNow(t);
    change(running ? pause(live, t) : play(live, t));
  };
  const move = (by: number) => {
    if (!live) return;
    const i = Math.min(periods.length - 1, Math.max(0, live.index + by));
    if (i === live.index) return;
    const t = Date.now();
    setNow(t);
    setPick(0);
    buzzed.current = false;
    change(goTo(live, i, periods[i].minutes, t));
  };
  const plus = (seconds: number) => live && change(addTime(live, seconds));
  const restart = () => {
    const t = Date.now();
    setNow(t);
    setPick(0);
    change(startState(ids, periods[0].minutes));
  };

  // Space = start/pause, arrows = previous/next period.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, select, textarea, button")) return;
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!live || !periods.length) {
    return (
      <main className="lv lv-empty">
        <h1>No practice to run yet</h1>
        <p>Build tonight's script on the Practice page, then come back here to run it on the field.</p>
        <Link to="/practice" className="lv-btn lv-btn-main">Plan a practice</Link>
      </main>
    );
  }

  const period = periods[live.index];
  const next = periods[live.index + 1];
  const items = [
    ...(period.drillIds ?? []).flatMap((id) => {
      const d = drillById.get(id);
      return d ? [{ key: `d-${id}`, name: d.name, minutes: d.minutes, setup: d.setup, points: d.coachingPoints, equipment: d.equipment, play: d.playId ? playById.get(d.playId) : undefined }] : [];
    }),
    ...period.playIds.flatMap((id) => {
      const p = playById.get(id);
      return p ? [{ key: `p-${id}`, name: p.name, minutes: 0, setup: p.description ?? "", points: [] as string[], equipment: [] as string[], play: p }] : [];
    }),
  ];
  const item = items[Math.min(pick, items.length - 1)];
  const total = period.minutes * 60 || 1;
  const done = Math.min(1, Math.max(0, 1 - left / total));
  const over = left < 0;
  const warn = !over && left <= 60;

  return (
    <main className={`lv${over ? " is-over" : warn ? " is-warn" : ""}`}>
      <header className="lv-top">
        <Link to="/practice" className="lv-back">← Practice</Link>
        <p className="lv-step">
          Period {live.index + 1} of {periods.length}
          {times[live.index] ? ` · ${times[live.index]}` : ""}
        </p>
        <button type="button" className="lv-link" onClick={restart}>Start over</button>
      </header>

      <section className="lv-clock" aria-label="Period clock">
        <h1 className="lv-title">{period.title}</h1>
        <p className="lv-time" role="timer" aria-live="off">{clock(left)}</p>
        <p className="sr-only" aria-live="polite">{over ? `${period.title} is over time` : warn ? `One minute left in ${period.title}` : ""}</p>
        <div className="lv-bar" aria-hidden="true"><span style={{ width: `${done * 100}%` }} /></div>
        {period.note && <p className="lv-note">{period.note}</p>}
      </section>

      {items.length > 0 && (
        <section className="lv-work" aria-label="What we're running">
          {items.length > 1 && (
            <div className="lv-tabs" role="tablist" aria-label="Drills this period">
              {items.map((it, k) => (
                <button key={it.key} type="button" role="tab" aria-selected={it === item} className={it === item ? "is-on" : ""} onClick={() => setPick(k)}>
                  {it.name}
                </button>
              ))}
            </div>
          )}
          <div className="lv-item">
            {item.play && (
              <div className="lv-diagram">
                <PlayThumb scene={item.play.scene} label={item.play.name} />
              </div>
            )}
            <div className="lv-cues">
              <h2>{item.name}{item.minutes ? <span> · {item.minutes} min</span> : null}</h2>
              {item.setup && <p>{item.setup}</p>}
              {item.points.length > 0 && (
                <ul>
                  {item.points.map((pt, k) => <li key={k}>{pt}</li>)}
                </ul>
              )}
              {item.equipment.length > 0 && <p className="lv-gear">Gear: {item.equipment.join(", ")}</p>}
            </div>
          </div>
        </section>
      )}

      <p className="lv-next">{next ? <>Next: <b>{next.title}</b> · {next.minutes} min</> : "Last period. Finish strong."}</p>

      <nav className="lv-controls" aria-label="Clock controls">
        <button type="button" className="lv-btn" onClick={() => move(-1)} disabled={live.index === 0} aria-label="Previous period">‹ Prev</button>
        <button type="button" className="lv-btn" onClick={() => plus(-60)} aria-label="Take a minute off">−1</button>
        <button type="button" className="lv-btn lv-btn-main" onClick={toggle}>{running ? "Pause" : left === total ? "Start" : "Resume"}</button>
        <button type="button" className="lv-btn" onClick={() => plus(60)} aria-label="Add a minute">+1</button>
        <button type="button" className="lv-btn" onClick={() => move(1)} disabled={!next} aria-label="Next period">Next ›</button>
      </nav>
    </main>
  );
}
