import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Shell } from "../components/Shell";
import { PlayThumb } from "../components/PlayThumb";
import { DRILL_CATEGORIES, loadDrills, newDrill, saveDrills, type Drill, type DrillCategory } from "../lib/drills";
import { gateSave } from "../lib/plan";
import { useStore } from "../lib/store";
import { useTier } from "../lib/tier";
import { useDocsVersion } from "../lib/docSync";
import { drillDiagram, drillFromStarter, STARTER_DRILLS, starterDrillScene } from "../lib/starters";
import type { Level } from "../lib/starters/drills";
import { askUpgrade } from "../lib/upgrade";
import { clock, isFilmLink, parseClock } from "../lib/runPlay";
import { FilmLink } from "../components/FilmLink";
import "../styles/drills.css";

const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Drill library: coaching details around a diagram from the Vault. Kept in
 * this browser and synced to the account while signed in; the diagram itself
 * is an ordinary Vault play, or the starter drill's own when added from the
 * Starter drills tab.
 */
export function Drills() {
  const plays = useStore((s) => s.plays);
  const tier = useTier();
  const [drills, setDrills] = useState<Drill[]>(loadDrills);
  const [filter, setFilter] = useState<DrillCategory | "all">("all");
  const [editing, setEditing] = useState<Drill | null>(null);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"mine" | "starter">(() => (loadDrills().length ? "mine" : "starter"));
  const [level, setLevel] = useState<Level | "all">("all");
  const byId = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const ver = useDocsVersion();
  useEffect(() => {
    if (ver) setDrills(loadDrills());
  }, [ver]);

  const commit = (next: Drill[]) => {
    setDrills(next);
    saveDrills(next);
  };
  const start = () => {
    setTab("mine");
    const gate = gateSave(tier, drills.length);
    if (!gate.ok) return askUpgrade(gate);
    setNotice("");
    setEditing(newDrill(""));
  };
  const save = (d: Drill) => {
    const clean = { ...d, name: d.name.trim(), updatedAt: Date.now() };
    if (!clean.name) return setNotice("Give the drill a name so you can find it later.");
    if (clean.film?.link && !isFilmLink(clean.film.link)) return setNotice("The film link has to be a Hudl or YouTube link that starts with https://.");
    if (!clean.film?.link) delete clean.film;
    setNotice("");
    commit(drills.some((x) => x.id === clean.id) ? drills.map((x) => (x.id === clean.id ? clean : x)) : [clean, ...drills]);
    setEditing(null);
  };
  const shown = drills.filter((d) => filter === "all" || d.category === filter);
  const have = new Map(drills.filter((d) => d.starterId).map((d) => [d.starterId!, d]));
  const starters = STARTER_DRILLS.filter((d) => (filter === "all" || d.category === filter) && (level === "all" || d.levels.includes(level)));
  const add = (keys: string[]) => {
    let next = drills;
    let added = 0;
    for (const key of keys) {
      const s = STARTER_DRILLS.find((d) => d.key === key);
      if (!s || next.some((d) => d.starterId === key)) continue;
      const gate = gateSave(tier, next.length);
      if (!gate.ok) {
        if (added) {
          setNotice(`Added ${added}, then your library was full.`);
          commit(next);
        }
        askUpgrade(gate);
        return;
      }
      next = [drillFromStarter(s), ...next];
      added++;
    }
    if (!added) return setNotice("Those are already in your drills.");
    commit(next);
    setNotice(added === 1 ? `${next[0].name} is in your drills. Edit it to make it yours, or pick it for a practice period.` : `Added ${added} drills to your library.`);
  };

  // "Add to my practice" on a public drill page (lax-vault.com/drills/…) lands here with ?add=<starter key>.
  const [params, setParams] = useSearchParams();
  const asked = useRef(false);
  useEffect(() => {
    const key = params.get("add");
    if (asked.current || !key) return;
    asked.current = true;
    setParams({}, { replace: true });
    const s = STARTER_DRILLS.find((d) => d.key === key);
    if (!s) return;
    setTab("mine");
    const have = drills.find((d) => d.starterId === key);
    if (have) setNotice(`${have.name} is already in your drills. Pick it for a period on Practice.`);
    else add([key]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell
      title="Drills"
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={start}>
          New drill
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h2>Drills</h2>
          <p>Keep the drills you run, with the setup, equipment and coaching points, and attach a diagram from your Vault. <Link to="/guide#drills">How Drills works</Link></p>
        </div>
      </div>
      <div className="tab-row dr-tabs" role="group" aria-label="Which drills to show">
        <button type="button" aria-pressed={tab === "mine"} className={tab === "mine" ? "is-on" : ""} onClick={() => setTab("mine")}>
          Your drills ({drills.length})
        </button>
        <button type="button" aria-pressed={tab === "starter"} className={tab === "starter" ? "is-on" : ""} onClick={() => (setTab("starter"), setEditing(null))}>
          Starter drills ({STARTER_DRILLS.length})
        </button>
      </div>
      {notice && <p className="dr-notice" role="status">{notice}</p>}

      {tab === "mine" && editing && (
        <form className="dr-form" onSubmit={(e) => { e.preventDefault(); save(editing); }} aria-label="Drill details">
          <label className="field"><span>Name</span>
            <input className="input" value={editing.name} maxLength={120} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          </label>
          <div className="dr-row">
            <label className="field"><span>Category</span>
              <select className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as DrillCategory })}>
                {DRILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field"><span>Minutes</span>
              <input className="input" type="number" min={1} max={180} value={editing.minutes} onChange={(e) => setEditing({ ...editing, minutes: Math.max(1, Math.min(180, Number(e.target.value) || 1)) })} />
            </label>
            <label className="field"><span>Players (min)</span>
              <input className="input" type="number" min={1} max={60} value={editing.players.min} onChange={(e) => setEditing({ ...editing, players: { ...editing.players, min: Math.max(1, Math.min(60, Number(e.target.value) || 1)) } })} />
            </label>
            <label className="field"><span>Players (max, 0 = any)</span>
              <input className="input" type="number" min={0} max={60} value={editing.players.max} onChange={(e) => setEditing({ ...editing, players: { ...editing.players, max: Math.max(0, Math.min(60, Number(e.target.value) || 0)) } })} />
            </label>
          </div>
          <label className="field"><span>Setup</span>
            <textarea className="input" rows={3} maxLength={2000} value={editing.setup} onChange={(e) => setEditing({ ...editing, setup: e.target.value })} />
          </label>
          <label className="field"><span>Equipment (one per line)</span>
            <textarea className="input" rows={3} value={editing.equipment.join("\n")} onChange={(e) => setEditing({ ...editing, equipment: lines(e.target.value).slice(0, 20) })} />
          </label>
          <label className="field"><span>Coaching points (one per line)</span>
            <textarea className="input" rows={4} value={editing.coachingPoints.join("\n")} onChange={(e) => setEditing({ ...editing, coachingPoints: lines(e.target.value).slice(0, 20) })} />
          </label>
          <div className="dr-row">
            <label className="field"><span>Film (Hudl or YouTube link)</span>
              <input
                className="input"
                type="url"
                inputMode="url"
                placeholder="https://youtu.be/… or https://www.hudl.com/…"
                value={editing.film?.link ?? ""}
                onChange={(e) => setEditing({ ...editing, film: e.target.value ? { ...editing.film, link: e.target.value } : undefined })}
              />
            </label>
            <label className="field"><span>Start at (m:ss)</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="0:00"
                key={editing.id + (editing.film?.startAt ?? "")}
                defaultValue={editing.film?.startAt ? clock(editing.film.startAt) : ""}
                disabled={!editing.film?.link}
                onBlur={(e) => {
                  const secs = e.target.value.trim() ? parseClock(e.target.value) : 0;
                  if (secs !== null && editing.film) setEditing({ ...editing, film: { ...editing.film, startAt: secs || undefined } });
                }}
              />
            </label>
          </div>
          <label className="field"><span>Diagram from your Vault</span>
            <select className="select" value={editing.playId ?? ""} onChange={(e) => setEditing({ ...editing, playId: e.target.value || undefined })}>
              <option value="">{editing.starterId ? "Starter diagram" : "No diagram"}</option>
              {plays.map((p) => <option key={p.id} value={p.id}>{p.name || "Untitled"}</option>)}
            </select>
          </label>
          {!plays.length && <p className="dr-hint">Nothing in your Vault yet. <Link to="/build">Draw a drill</Link> first, then attach it here.</p>}
          <div className="dr-actions">
            <button type="submit" className="btn btn-primary btn-sm">Save drill</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setNotice(""); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="dr-filters">
        <label className="field dr-filter"><span>Show</span>
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as DrillCategory | "all")}>
            <option value="all">All categories</option>
            {DRILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {tab === "starter" && (
          <label className="field dr-filter"><span>Level</span>
            <select className="select" value={level} onChange={(e) => setLevel(e.target.value as Level | "all")}>
              <option value="all">Every level</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
        )}
        {tab === "starter" && starters.some((s) => !have.has(s.key)) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => add(starters.map((s) => s.key))}>
            Add all {starters.filter((s) => !have.has(s.key)).length} shown
          </button>
        )}
      </div>

      {tab === "starter" && (
        <>
          <p className="dr-hint">Drills youth and high-school programs run most, each with the setup, what to say and a diagram. Add one and it's yours to edit and pick for a practice.</p>
          <ul className="dr-list">
            {starters.map((s) => {
              const mine = have.get(s.key);
              return (
                <li key={s.key} className="dr-card">
                  <div className="dr-thumb"><PlayThumb scene={starterDrillScene(s)} label={s.name} /></div>
                  <div className="dr-body">
                    <h3>{s.name}</h3>
                    <p className="dr-meta">{s.category} · {s.minutes} min · {s.players.min}{s.players.max ? `–${s.players.max}` : "+"} players · {s.levels.length === 3 ? "Every level" : s.levels.join(", ")}</p>
                    <p>{s.setup}</p>
                    <ul>{s.coachingPoints.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    {s.equipment.length > 0 && <p className="dr-meta">Equipment: {s.equipment.join(", ")}</p>}
                    <div className="dr-actions">
                      {mine ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setTab("mine"), setEditing(mine))}>In your drills · Edit</button>
                      ) : (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => add([s.key])} aria-label={`Add ${s.name} to your drills`}>Add to my drills</button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {!starters.length && <p className="dr-hint">No starter drills match. Try every level or all categories.</p>}
        </>
      )}

      {tab === "mine" && !drills.length && !editing && (
        <div className="empty empty-sm">
          <h3>No drills yet</h3>
          <p>Start with a few starter drills, or add the drills you already run, then drop them into tonight's practice.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab("starter")}>Browse starter drills</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={start}>Write your own</button>
        </div>
      )}

      {tab === "mine" && <ul className="dr-list">
        {shown.map((d) => {
          const diagram = drillDiagram(d, byId);
          return (
            <li key={d.id} className="dr-card">
              {diagram && <div className="dr-thumb"><PlayThumb scene={diagram.scene} label={diagram.name} /></div>}
              <div className="dr-body">
                <h3>{d.name}</h3>
                <p className="dr-meta">{d.category} · {d.minutes} min · {d.players.min}{d.players.max ? `–${d.players.max}` : "+"} players</p>
                {d.setup && <p>{d.setup}</p>}
                {d.coachingPoints.length > 0 && <ul>{d.coachingPoints.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                {d.equipment.length > 0 && <p className="dr-meta">Equipment: {d.equipment.join(", ")}</p>}
                {d.film && <FilmLink film={d.film} />}
                <div className="dr-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(d)}>Edit</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm(`Delete "${d.name}"?`)) commit(drills.filter((x) => x.id !== d.id)); }}>Delete</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>}
    </Shell>
  );
}
