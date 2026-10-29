import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { PlayThumb } from "../components/PlayThumb";
import { DRILL_CATEGORIES, loadDrills, newDrill, saveDrills, type Drill, type DrillCategory } from "../lib/drills";
import { gateSave } from "../lib/plan";
import { useStore } from "../lib/store";
import { useTier } from "../lib/tier";
import { useDocsVersion } from "../lib/docSync";
import "../styles/drills.css";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Drill library: coaching details around a diagram from the Vault. Kept in
 * this browser and synced to the account while signed in; the diagram itself
 * is an ordinary Vault play.
 */
export function Drills() {
  const plays = useStore((s) => s.plays);
  const tier = useTier();
  const [drills, setDrills] = useState<Drill[]>(loadDrills);
  const [filter, setFilter] = useState<DrillCategory | "all">("all");
  const [editing, setEditing] = useState<Drill | null>(null);
  const [notice, setNotice] = useState("");
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
    const gate = gateSave(tier, drills.length);
    if (!gate.ok) return setNotice(gate.reason ?? "");
    setNotice("");
    setEditing(newDrill(""));
  };
  const save = (d: Drill) => {
    const clean = { ...d, name: d.name.trim(), updatedAt: Date.now() };
    if (!clean.name) return setNotice("Give the drill a name so you can find it later.");
    setNotice("");
    commit(drills.some((x) => x.id === clean.id) ? drills.map((x) => (x.id === clean.id ? clean : x)) : [clean, ...drills]);
    setEditing(null);
  };
  const shown = drills.filter((d) => filter === "all" || d.category === filter);

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
          <p>Keep the drills you run, with the setup, equipment and coaching points, and attach a diagram from your Vault.</p>
        </div>
      </div>
      {notice && <p className="dr-notice" role="status">{notice}</p>}

      {editing && (
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
          <label className="field"><span>Diagram from your Vault</span>
            <select className="select" value={editing.playId ?? ""} onChange={(e) => setEditing({ ...editing, playId: e.target.value || undefined })}>
              <option value="">No diagram</option>
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

      <label className="field dr-filter"><span>Show</span>
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as DrillCategory | "all")}>
          <option value="all">All categories</option>
          {DRILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>

      {!drills.length && !editing && (
        <div className="empty empty-sm">
          <h3>No drills yet</h3>
          <p>Add the drills you run most, then drop them into tonight's practice.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={start}>Add your first drill</button>
        </div>
      )}

      <ul className="dr-list">
        {shown.map((d) => {
          const play = d.playId ? byId.get(d.playId) : undefined;
          return (
            <li key={d.id} className="dr-card">
              {play && <div className="dr-thumb"><PlayThumb scene={play.scene} label={play.name} /></div>}
              <div className="dr-body">
                <h3>{d.name}</h3>
                <p className="dr-meta">{d.category} · {d.minutes} min · {d.players.min}{d.players.max ? `–${d.players.max}` : "+"} players</p>
                {d.setup && <p>{d.setup}</p>}
                {d.coachingPoints.length > 0 && <ul>{d.coachingPoints.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                {d.equipment.length > 0 && <p className="dr-meta">Equipment: {d.equipment.join(", ")}</p>}
                <div className="dr-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(d)}>Edit</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm(`Delete "${d.name}"?`)) commit(drills.filter((x) => x.id !== d.id)); }}>Delete</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
