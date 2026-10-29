import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { PlayThumb } from "../components/PlayThumb";
import { loadDrills, saveDrills } from "../lib/drills";
import { clockTimes, deletePractice, hasSavedScript, loadSaved, loadScript, newPeriod, savePractice, saveScript, totalMinutes, type Period, type SavedPractice, type Script } from "../lib/practice";
import { useStore } from "../lib/store";
import { track } from "../lib/track";
import { useDocsVersion } from "../lib/docSync";
import { applyPlan, drillDiagram, planMinutes, STARTER_PLANS } from "../lib/starters";
import type { StarterPlan } from "../lib/starters/plans";
import { useTier } from "../lib/tier";
import { gatePractice } from "../lib/plan";
import { askUpgrade } from "../lib/upgrade";
import { MADE_WITH } from "../lib/site";
import "../styles/practice.css";

/**
 * Practice planner: the script for the night and the drill cards that go
 * with it. Plays come from the Vault; nothing here changes a play.
 */
export function Practice() {
  const plays = useStore((s) => s.plays);
  const books = useStore((s) => s.playbooks);
  const [script, setScript] = useState<Script>(loadScript);
  const ver = useDocsVersion();
  const [added, setAdded] = useState(0);
  const drills = useMemo(loadDrills, [ver, added]);
  const tier = useTier();
  const [plans, setPlans] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [shelfTick, setShelfTick] = useState(0);
  const shelf = useMemo(loadSaved, [ver, shelfTick]);
  const built = (useLocation().state as { built?: string } | null)?.built;
  const [notice, setNotice] = useState(built ?? "");
  const [fresh] = useState(() => !hasSavedScript());
  useEffect(() => {
    if (ver) setScript(loadScript());
  }, [ver]);
  const drillById = useMemo(() => new Map(drills.map((d) => [d.id, d])), [drills]);
  const [out, setOut] = useState<"script" | "cards" | null>(null);
  useEffect(() => track("practice_opened"), []);

  const change = (next: Script) => {
    setScript(next);
    saveScript(next);
  };
  const edit = (id: string, patch: Partial<Period>) => change({ ...script, periods: script.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const byId = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const times = clockTimes(script);

  // Print the chosen layout, then return to the editor.
  useEffect(() => {
    if (!out) return;
    const done = () => setOut(null);
    window.addEventListener("afterprint", done, { once: true });
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [out]);

  const cards = script.periods.flatMap((p) => p.playIds.map((id) => ({ period: p, play: byId.get(id) })).filter((c) => c.play));
  const drillCards = script.periods.flatMap((p) => (p.drillIds ?? []).map((id) => ({ period: p, drill: drillById.get(id) })).filter((x) => x.drill));
  const any = script.periods.some((p) => p.playIds.length || p.drillIds?.length);

  const startPlan = (plan: StarterPlan) => {
    if (any && !window.confirm(`Replace "${script.name}" with ${plan.name}? Your drills and plays stay in your library.`)) return;
    const res = applyPlan(plan, drills, tier, script);
    if (res.added) {
      saveDrills(res.drills);
      setAdded((n) => n + 1);
    }
    change(res.script);
    setPlans(false);
    const drillNote = res.added ? ` ${res.added} starter ${res.added === 1 ? "drill was" : "drills were"} added to your drills.` : "";
    const missNote = res.missed.length ? ` Your library is full, so ${res.missed.join(", ")} ${res.missed.length === 1 ? "is" : "are"} named in the period note instead.` : "";
    setNotice(`${plan.name} is tonight's script, ${planMinutes(plan)} minutes.${drillNote}${missNote} Change any period to fit your team.`);
  };

  // Saving under a name already on the shelf updates that one; a new name is a new saved practice.
  const sameName = (p: SavedPractice) => p.name.trim().toLowerCase() === script.name.trim().toLowerCase();
  const keep = () => {
    const over = shelf.find(sameName);
    if (!over) {
      const gate = gatePractice(tier, shelf.length);
      if (!gate.ok) return askUpgrade(gate);
    }
    savePractice(script, over?.id);
    setShelfTick((n) => n + 1);
    setNotice(over ? `Saved over "${over.name}".` : `"${script.name}" is saved. Open it from Saved practices any night.`);
  };
  const open = (p: SavedPractice) => {
    if (any && !sameName(p) && !window.confirm(`Open "${p.name}"? It replaces the script on screen. Save that one first if you want to keep it.`)) return;
    change({ name: p.name, start: p.start, periods: p.periods });
    setShelfOpen(false);
    setNotice(`"${p.name}" is tonight's script. Changes stay here until you save it again.`);
  };
  const remove = (p: SavedPractice) => {
    if (!window.confirm(`Delete the saved practice "${p.name}"? The script on screen and your drills stay.`)) return;
    deletePractice(p.id);
    setShelfTick((n) => n + 1);
  };
  const capped = tier.practiceLimit < 1000;

  return (
    <Shell
      title="Practice"
      actions={
        <>
          <Link to="/tonight" className="btn btn-ghost btn-sm">
            <Icon name="sparkle" size={15} /> Build tonight's practice
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={keep}>
            <Icon name="save" size={15} /> Save practice
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShelfOpen((v) => !v)} aria-expanded={shelfOpen}>
            <Icon name="folder" size={15} /> Saved practices{shelf.length ? ` (${shelf.length})` : ""}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlans((v) => !v)} aria-expanded={plans}>
            <Icon name="plus" size={15} /> Start from a plan
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOut("cards")} disabled={!cards.length && !drillCards.length}>
            <Icon name="print" size={15} /> Print drill cards
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOut("script")} disabled={!script.periods.length}>
            <Icon name="print" size={15} /> Print script
          </button>
          {script.periods.length > 0 && (
            <Link to="/practice/live" className="btn btn-primary btn-sm">
              <Icon name="play" size={15} /> Run live
            </Link>
          )}
        </>
      }
    >
      <div className="page-head">
        <div>
          <h2>Practice</h2>
          <p>Build tonight's script or start from a ready-made plan, print it with a card for every drill, or run it live on the field with the clock and coaching points. <Link to="/guide#first-practice">Walk me through it</Link></p>
        </div>
      </div>

      {notice && (
        <p className="pr-notice" role="status">
          {notice}
          {built && (
            <span className="pr-notice-acts">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOut("script")}>
                <Icon name="print" size={15} /> Print script
              </button>
              <Link to="/practice/live" className="btn btn-primary btn-sm">
                <Icon name="play" size={15} /> Run live
              </Link>
            </span>
          )}
        </p>
      )}

      {fresh && !notice && (
        <section className="pr-fresh" aria-labelledby="pr-fresh-h">
          <div>
            <h3 id="pr-fresh-h">New here? Build tonight's practice in about a minute.</h3>
            <p>Pick the age group, the kind of night and how long you have the field. You get a timed script with drills, setup and coaching points.</p>
          </div>
          <Link to="/tonight" className="btn btn-primary">
            Build tonight's practice <Icon name="next" size={15} />
          </Link>
        </section>
      )}

      {shelfOpen && (
        <section className="pr-plans" aria-label="Saved practices">
          <div className="pr-plans-head">
            <h3>Saved practices</h3>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShelfOpen(false)}>Close</button>
          </div>
          <p className="pr-hint">
            Save a practice to run it again next week. Saving under the same name updates it; a new name saves a copy.
            {capped && ` ${tier.name} keeps ${tier.practiceLimit}; you've used ${Math.min(shelf.length, tier.practiceLimit)}.`}
          </p>
          {shelf.length ? (
            <ul className="pr-shelf">
              {shelf.map((p) => (
                <li key={p.id}>
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {totalMinutes(p)} min · {p.periods.length} periods · saved {new Date(p.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </small>
                  </span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => open(p)} aria-label={`Open ${p.name}`}>Open</button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}>Delete</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pr-hint">Nothing saved yet. Name the script below, then press Save practice.</p>
          )}
        </section>
      )}

      {plans && (
        <section className="pr-plans" aria-label="Ready-made practice plans">
          <div className="pr-plans-head">
            <h3>Ready-made plans</h3>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPlans(false)}>Close</button>
          </div>
          <p className="pr-hint">Pick one to make it tonight's script. Each period comes with its drills, so the drill cards and live mode are ready. Change anything after.</p>
          <ul className="pr-plan-list">
            {STARTER_PLANS.map((plan) => (
              <li key={plan.key} className="pr-plan">
                <h4>{plan.name}</h4>
                <p className="pr-plan-meta">{planMinutes(plan)} min · {plan.who} · {plan.level}</p>
                <p>{plan.summary}</p>
                <ol>
                  {plan.periods.map((p, k) => <li key={k}><b>{p.title}</b> {p.minutes} min</li>)}
                </ol>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => startPlan(plan)} aria-label={`Use the ${plan.name} plan`}>Use this plan</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pr-edit">
        <div className="pr-top">
          <label className="field">
            <span>Script name</span>
            <input className="input" value={script.name} maxLength={60} onChange={(e) => change({ ...script, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Start time</span>
            <input className="input" type="time" value={script.start} onChange={(e) => change({ ...script, start: e.target.value })} />
          </label>
          <p className="pr-total">{totalMinutes(script)} minutes</p>
        </div>

        {!plays.length && !drills.length && (
          <div className="empty empty-sm">
            <h3>Nothing to pick yet</h3>
            <p>Start from a ready-made plan and its drills come with it, or add drills and diagrams, then pick them for each period here.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setPlans(true)}>Start from a plan</button>
            <Link to="/drills" className="btn btn-ghost btn-sm">Add a drill</Link>
            <Link to="/build" className="btn btn-ghost btn-sm">Draw a diagram</Link>
          </div>
        )}

        {script.periods.map((p, i) => (
          <section key={p.id} className="pr-period" aria-label={p.title}>
            <div className="pr-head">
              <input className="input pr-title" aria-label="Period name" value={p.title} maxLength={40} onChange={(e) => edit(p.id, { title: e.target.value })} />
              <label className="pr-min">
                <input className="input" type="number" min={0} max={180} aria-label={`Minutes for ${p.title}`} value={p.minutes} onChange={(e) => edit(p.id, { minutes: Math.max(0, Math.min(180, Number(e.target.value) || 0)) })} />
                <span>min</span>
              </label>
              {times[i] && <span className="pill">{times[i]}</span>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => change({ ...script, periods: script.periods.filter((x) => x.id !== p.id) })}>
                Remove
              </button>
            </div>
            <input className="input" aria-label={`Note for ${p.title}`} placeholder="Coaching point or drill" value={p.note} maxLength={120} onChange={(e) => edit(p.id, { note: e.target.value })} />
            {(p.drillIds?.length ?? 0) > 0 && (
              <ul className="pr-plays">
                {p.drillIds!.map((id, k) => (
                  <li key={`${id}-${k}`}>
                    <span>{drillById.get(id)?.name ?? "Removed drill"}</span>
                    <button type="button" aria-label={`Take ${drillById.get(id)?.name ?? "drill"} out of ${p.title}`} onClick={() => edit(p.id, { drillIds: p.drillIds!.filter((_, j) => j !== k) })}>×</button>
                  </li>
                ))}
              </ul>
            )}
            <ul className="pr-plays">
              {p.playIds.map((id, k) => (
                <li key={`${id}-${k}`}>
                  <span>{byId.get(id)?.name ?? "Removed play"}</span>
                  <button type="button" aria-label={`Take ${byId.get(id)?.name ?? "play"} out of ${p.title}`} onClick={() => edit(p.id, { playIds: p.playIds.filter((_, j) => j !== k) })}>×</button>
                </li>
              ))}
            </ul>
            <div className="pr-add">
              {drills.length > 0 && (
                <select className="select" aria-label={`Add a drill to ${p.title}`} value="" onChange={(e) => e.target.value && edit(p.id, { drillIds: [...(p.drillIds ?? []), e.target.value] })}>
                  <option value="">Add a drill…</option>
                  {drills.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.minutes} min)</option>
                  ))}
                </select>
              )}
              <select className="select" aria-label={`Add a play to ${p.title}`} value="" onChange={(e) => e.target.value && edit(p.id, { playIds: [...p.playIds, e.target.value] })}>
                <option value="">Add a play…</option>
                {plays.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
              {books.length > 0 && (
                <select
                  className="select"
                  aria-label={`Add a playbook to ${p.title}`}
                  value=""
                  onChange={(e) => {
                    const b = books.find((x) => x.id === e.target.value);
                    if (b) edit(p.id, { playIds: [...p.playIds, ...b.playIds.filter((id) => byId.has(id))] });
                  }}
                >
                  <option value="">Add a whole playbook…</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.playIds.length})</option>
                  ))}
                </select>
              )}
            </div>
          </section>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => change({ ...script, periods: [...script.periods, newPeriod("Period", 10)] })}>
          <Icon name="plus" size={15} /> Add a period
        </button>
        {!any && (plays.length > 0 || drills.length > 0) && <p className="pr-hint">Pick drills or plays for each period and the drill cards fill themselves.</p>}
      </div>

      {out === "script" && (
        <article className="pr-out pr-sheet">
          <h1>{script.name}</h1>
          <p>{totalMinutes(script)} minutes{script.start ? ` · starts ${times[0]}` : ""}</p>
          {script.periods.map((p, i) => (
            <section key={p.id}>
              <h2>{times[i] ? `${times[i]} · ` : ""}{p.title} <span>{p.minutes} min</span></h2>
              {p.note && <p className="pr-note">{p.note}</p>}
              {((p.drillIds?.length ?? 0) > 0 || p.playIds.length > 0) && (
                <ol>
                  {(p.drillIds ?? []).map((id, k) => <li key={`d-${id}-${k}`}>{drillById.get(id)?.name ?? "Removed drill"}{drillById.get(id) ? ` (${drillById.get(id)!.minutes} min)` : ""}</li>)}
                  {p.playIds.map((id, k) => <li key={`${id}-${k}`}>{byId.get(id)?.name ?? "Removed play"}</li>)}
                </ol>
              )}
            </section>
          ))}
          {tier.watermark && <p className="pr-made">{MADE_WITH}</p>}
        </article>
      )}

      {out === "cards" && (
        <div className="pr-out pr-cards">
          {drillCards.map(({ period, drill }, k) => {
            const dp = drillDiagram(drill!, byId);
            return (
              <figure key={`${drill!.id}-${k}`} className="pr-card">
                <figcaption>
                  <span>{period.title}</span>
                  <b>{drill!.name}</b>
                  <i>{drill!.minutes} min</i>
                </figcaption>
                {dp && <PlayThumb scene={dp.scene} label={dp.name} />}
                {drill!.setup && <p>{drill!.setup}</p>}
                {drill!.coachingPoints.length > 0 && <p>{drill!.coachingPoints.join(" · ")}</p>}
              </figure>
            );
          })}
          {cards.map(({ period, play }, k) => (
            <figure key={`${play!.id}-${k}`} className="pr-card">
              <figcaption>
                <span>{period.title}</span>
                <b>{play!.name}</b>
                {play!.formation && <i>{play!.formation}</i>}
              </figcaption>
              <PlayThumb scene={play!.scene} label={play!.name} />
              {play!.description && <p>{play!.description}</p>}
            </figure>
          ))}
          {tier.watermark && <p className="pr-made">{MADE_WITH}</p>}
        </div>
      )}
    </Shell>
  );
}
