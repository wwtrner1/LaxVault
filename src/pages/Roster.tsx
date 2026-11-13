import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { PrintTeam } from "../components/PrintTeam";
import { useToast } from "../lib/toast";
import { useTier } from "../lib/tier";
import { useTeam } from "../lib/useTeam";
import { gateBranding } from "../lib/plan";
import { hasTeam } from "../lib/team";
import { MADE_WITH } from "../lib/site";
import {
  autoFill,
  byNumber,
  duplicateNumbers,
  FORMATS,
  fullName,
  LINEUP_MAX,
  newLineup,
  parsePlayers,
  POSITIONS,
  rankFor,
  ROSTER_MAX,
  rosterStore,
  saveRoster,
  STATUSES,
  uid,
  unitsFor,
  unitsOf,
  unused,
  type Format,
  type Lineup,
  type Pos,
  type RosterDoc,
  type RosterPlayer,
} from "../lib/roster";
import { lineupFileName, lineupPdf } from "../lib/lineupPdf";
import "../styles/roster.css";

type Tab = "roster" | "lineup";
const TAB_KEY = "laxvault.rostertab.v1";
const posShort = (p: RosterPlayer) => p.pos.map((id) => POSITIONS.find((x) => x.id === id)?.short ?? id).join(" / ");

/**
 * Roster & lineups (/roster): the team list, then game-day lineups built from
 * it by unit (attack, midfield lines, defense, goalies, face-off, man-up,
 * man-down), with a lineup card that prints, saves as a PDF or shares from a
 * phone. Everything works signed out; signed in, it follows the coach to
 * every device.
 */
export function Roster() {
  const doc = useSyncExternalStore(rosterStore.subscribe, rosterStore.get, rosterStore.get);
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return localStorage.getItem(TAB_KEY) === "lineup" ? "lineup" : "roster";
    } catch {
      return "roster";
    }
  });
  const pickTab = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* the tab still switches */
    }
  };
  const change = (next: Partial<RosterDoc>) => saveRoster({ ...doc, ...next });
  const ready = doc.players.filter((p) => p.status === "active").length;

  return (
    <Shell title="Roster & lineups">
      <div className="ro-page">
        <div className="ro-tabs" role="tablist" aria-label="Roster or lineup">
          <button type="button" role="tab" aria-selected={tab === "roster"} className={tab === "roster" ? "is-on" : ""} onClick={() => pickTab("roster")}>
            Roster <span>{doc.players.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === "lineup"} className={tab === "lineup" ? "is-on" : ""} onClick={() => pickTab("lineup")}>
            Game-day lineup <span>{doc.lineups.length}</span>
          </button>
        </div>
        <p className="ro-sub">
          {doc.players.length
            ? `${doc.players.length} player${doc.players.length === 1 ? "" : "s"}, ${ready} ready. `
            : "Add your players once; every lineup and diagram label reads from here. "}
          Numbers and names show on your diagrams too: Designer → Labels.
        </p>
        {tab === "roster" ? <RosterTab doc={doc} change={change} onLineup={() => pickTab("lineup")} /> : <LineupTab doc={doc} change={change} onRoster={() => pickTab("roster")} />}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ roster --- */

function PosChips({ value, onChange, idPrefix }: { value: Pos[]; onChange: (v: Pos[]) => void; idPrefix: string }) {
  return (
    <div className="ro-chips" role="group" aria-label="Positions (tap all that apply; the first is the main one)">
      {POSITIONS.map((p) => {
        const at = value.indexOf(p.id);
        return (
          <button
            key={p.id}
            id={`${idPrefix}-${p.id}`}
            type="button"
            className={at >= 0 ? (at === 0 ? "is-on is-main" : "is-on") : ""}
            aria-pressed={at >= 0}
            title={p.label}
            onClick={() => onChange(at >= 0 ? value.filter((x) => x !== p.id) : [...value, p.id])}
          >
            {p.short}
          </button>
        );
      })}
    </div>
  );
}

function RosterTab({ doc, change, onLineup }: { doc: RosterDoc; change: (n: Partial<RosterDoc>) => void; onLineup: () => void }) {
  const toast = useToast();
  const [num, setNum] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [pos, setPos] = useState<Pos[]>([]);
  const [paste, setPaste] = useState<string | null>(null);
  const [sort, setSort] = useState<"number" | "name" | "pos">("number");
  const [only, setOnly] = useState<Pos | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmGone, setConfirmGone] = useState<string | null>(null);
  const numRef = useRef<HTMLInputElement>(null);
  const dupes = duplicateNumbers(doc.players);
  const full = doc.players.length >= ROSTER_MAX;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!first.trim() && !last.trim() && !num.trim()) return toast("Type a number or a name first.");
    if (full) return toast(`A roster holds ${ROSTER_MAX} players. Remove someone first.`);
    const p: RosterPlayer = { id: uid(), first: first.trim(), last: last.trim(), number: num.replace(/\D/g, "").slice(0, 3), pos, status: "active" };
    change({ players: [...doc.players, p] });
    if (p.number && doc.players.some((x) => x.number === p.number)) toast(`Heads up: #${p.number} is already on the roster.`);
    setNum("");
    setFirst("");
    setLast("");
    setPos([]);
    // Straight on to the next player, keyboard up on a phone.
    numRef.current?.focus();
  };

  const addPasted = () => {
    const found = parsePlayers(paste ?? "");
    if (!found.length) return toast("Nothing to add. Put one player on each line, like 12 Jake Smith A.");
    const room = ROSTER_MAX - doc.players.length;
    change({ players: [...doc.players, ...found.slice(0, room)] });
    toast(found.length > room ? `Added ${room}; a roster holds ${ROSTER_MAX}.` : `Added ${found.length} player${found.length === 1 ? "" : "s"}.`);
    setPaste(null);
  };

  const patch = (id: string, p: Partial<RosterPlayer>) => change({ players: doc.players.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const remove = (p: RosterPlayer) => {
    const before = doc;
    // Taking a player off the roster takes him out of every lineup too.
    change({
      players: doc.players.filter((x) => x.id !== p.id),
      lineups: doc.lineups.map((l) => ({ ...l, slots: Object.fromEntries(Object.entries(l.slots).filter(([, v]) => v !== p.id)) })),
    });
    void before;
    toast(`${fullName(p)} removed from the roster and every lineup.`);
  };

  const shown = useMemo(() => {
    const list = doc.players.filter((p) => only === "all" || p.pos.includes(only));
    const order = (p: RosterPlayer) => POSITIONS.findIndex((x) => x.id === p.pos[0]);
    return list.sort(sort === "number" ? byNumber : sort === "name" ? (a, b) => (a.last || a.first).localeCompare(b.last || b.first) : (a, b) => (order(a) < 0 ? 99 : order(a)) - (order(b) < 0 ? 99 : order(b)) || byNumber(a, b));
  }, [doc.players, only, sort]);

  return (
    <>
      <form className="ro-card ro-add" onSubmit={add} aria-label="Add a player">
        <div className="ro-add-row">
          <label className="ro-num">
            <span>#</span>
            <input ref={numRef} className="input" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))} aria-label="Jersey number" placeholder="12" />
          </label>
          <label>
            <span>First</span>
            <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} autoCapitalize="words" autoComplete="off" placeholder="Jake" />
          </label>
          <label>
            <span>Last</span>
            <input className="input" value={last} onChange={(e) => setLast(e.target.value)} autoCapitalize="words" autoComplete="off" placeholder="Smith" />
          </label>
        </div>
        <PosChips value={pos} onChange={setPos} idPrefix="add-pos" />
        <div className="ro-add-acts">
          <button type="submit" className="btn btn-primary" disabled={full}>
            <Icon name="plus" size={16} /> Add player
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setPaste(paste === null ? "" : null)} aria-expanded={paste !== null}>
            Paste a whole list
          </button>
        </div>
        {paste !== null && (
          <div className="ro-paste">
            <label htmlFor="ro-paste">One player a line: number, name and positions, in any order. Copy a column straight from a spreadsheet or a team app.</label>
            <textarea id="ro-paste" className="textarea" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"12 Jake Smith A\n7 Tom Reyes M FO\n22 Luke Brown LSM\n1 Max Cole G"} />
            <button type="button" className="btn btn-primary" onClick={addPasted}>
              Add these players
            </button>
          </div>
        )}
      </form>

      {dupes.length > 0 && (
        <p className="ro-warn" role="status">
          Two players wear {dupes.map((d) => `#${d}`).join(", ")}. Fix it before the officials check the book.
        </p>
      )}

      {doc.players.length > 0 ? (
        <>
          <div className="ro-filters">
            <label>
              <span className="sr-only">Sort by</span>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort the roster">
                <option value="number">By number</option>
                <option value="name">By last name</option>
                <option value="pos">By position</option>
              </select>
            </label>
            <div className="ro-chips is-filter" role="group" aria-label="Show only">
              <button type="button" className={only === "all" ? "is-on" : ""} aria-pressed={only === "all"} onClick={() => setOnly("all")}>
                All
              </button>
              {POSITIONS.map((p) => (
                <button key={p.id} type="button" className={only === p.id ? "is-on" : ""} aria-pressed={only === p.id} onClick={() => setOnly(only === p.id ? "all" : p.id)}>
                  {p.short} <small>{doc.players.filter((x) => x.pos.includes(p.id)).length}</small>
                </button>
              ))}
            </div>
          </div>
          <ul className="ro-list">
            {shown.map((p) => (
              <li key={p.id} className={`ro-player${p.status !== "active" ? " is-out" : ""}${dupes.includes(p.number) ? " is-dupe" : ""}`}>
                <div className="ro-row">
                  <b className="ro-badge" aria-label={p.number ? `Number ${p.number}` : "No number"}>
                    {p.number || "–"}
                  </b>
                  <span className="ro-name">
                    <strong>{fullName(p)}</strong>
                    <small>
                      {posShort(p) || "No position yet"}
                      {p.grad ? ` · ${p.grad}` : ""}
                      {p.status !== "active" ? ` · ${STATUSES.find((s) => s.id === p.status)?.label}` : ""}
                    </small>
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" aria-expanded={editing === p.id} onClick={() => setEditing(editing === p.id ? null : p.id)}>
                    {editing === p.id ? "Done" : "Edit"}
                  </button>
                </div>
                {editing === p.id && (
                  <div className="ro-edit">
                    <div className="ro-add-row">
                      <label className="ro-num">
                        <span>#</span>
                        <input className="input" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={p.number} onChange={(e) => patch(p.id, { number: e.target.value.replace(/\D/g, "") })} />
                      </label>
                      <label>
                        <span>First</span>
                        <input className="input" value={p.first} onChange={(e) => patch(p.id, { first: e.target.value })} autoCapitalize="words" />
                      </label>
                      <label>
                        <span>Last</span>
                        <input className="input" value={p.last} onChange={(e) => patch(p.id, { last: e.target.value })} autoCapitalize="words" />
                      </label>
                    </div>
                    <PosChips value={p.pos} onChange={(v) => patch(p.id, { pos: v })} idPrefix={`pos-${p.id}`} />
                    <div className="ro-add-row">
                      <label>
                        <span>Status</span>
                        <select className="select" value={p.status} onChange={(e) => patch(p.id, { status: e.target.value as RosterPlayer["status"] })}>
                          {STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Grad year</span>
                        <input className="input" inputMode="numeric" value={p.grad ?? ""} onChange={(e) => patch(p.id, { grad: e.target.value.slice(0, 12) })} placeholder="2029" />
                      </label>
                    </div>
                    <label className="ro-note">
                      <span>Note</span>
                      <input className="input" value={p.note ?? ""} onChange={(e) => patch(p.id, { note: e.target.value.slice(0, 200) })} placeholder="Lefty, plays both ends" />
                    </label>
                    <button type="button" className="btn btn-ghost btn-sm is-danger" onClick={() => (confirmGone === p.id ? remove(p) : setConfirmGone(p.id))}>
                      {confirmGone === p.id ? `Tap again to remove ${fullName(p)}` : "Remove from roster"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary ro-next" onClick={onLineup}>
            Build the game-day lineup →
          </button>
        </>
      ) : (
        <div className="ro-empty">
          <h3>No players yet</h3>
          <p>Add them one at a time above, or paste the whole list from a spreadsheet or your league's team app. Positions: A attack, M middie, D defense, G goalie, LSM long stick, FO face-off, SSDM D-middie.</p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ lineup --- */

function LineupTab({ doc, change, onRoster }: { doc: RosterDoc; change: (n: Partial<RosterDoc>) => void; onRoster: () => void }) {
  const toast = useToast();
  const tier = useTier();
  const team = useTeam();
  const branded = gateBranding(tier).ok && hasTeam(team);
  const lineup = doc.lineups.find((l) => l.id === doc.current) ?? doc.lineups[0];
  const byId = useMemo(() => new Map(doc.players.map((p) => [p.id, p])), [doc.players]);
  const units = unitsFor(lineup.format);
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);

  const setLineup = (patch: Partial<Lineup>) => change({ lineups: doc.lineups.map((l) => (l.id === lineup.id ? { ...l, ...patch } : l)) });
  const setSlot = (key: string, id: string) => {
    const slots = { ...lineup.slots };
    if (id) slots[key] = id;
    else delete slots[key];
    setLineup({ slots });
  };

  const addLineup = (copy: boolean) => {
    if (doc.lineups.length >= LINEUP_MAX) return toast(`You can keep ${LINEUP_MAX} lineups. Delete an old one first.`);
    const l: Lineup = copy ? { ...lineup, id: uid(), name: `${lineup.name} (copy)` } : newLineup(lineup.format, "Game day");
    change({ lineups: [...doc.lineups, l], current: l.id });
  };
  const deleteLineup = () => {
    const before = doc;
    const rest = doc.lineups.filter((l) => l.id !== lineup.id);
    const lineups = rest.length ? rest : [newLineup(lineup.format)];
    change({ lineups, current: lineups[0].id });
    void before;
    toast(`${lineup.name} deleted.`);
  };
  const fill = () => {
    const next = autoFill(lineup, doc.players);
    const n = Object.keys(next.slots).length - Object.keys(lineup.slots).length;
    setLineup({ slots: next.slots });
    toast(n ? `Filled ${n} spot${n === 1 ? "" : "s"} from the positions on your roster. Change any of them.` : "Every spot that a ready player fits is filled. Give players positions on the Roster tab to fill more.");
  };

  const filled = Object.keys(lineup.slots).length;
  const out = unused(lineup, doc.players);
  const hurt = doc.players.filter((p) => p.status !== "active" && Object.values(lineup.slots).includes(p.id));

  // Print straight from the tap, so iPhone and iPad Safari allow it, with the card already on the page.
  const print = () => {
    if (!filled) return toast("The card is empty. Fill a few spots first, or tap Fill empty spots.");
    flushSync(() => setBusy(false));
    window.print();
  };
  const pdf = async (share: boolean) => {
    if (!filled) return toast("The card is empty. Fill a few spots first, or tap Fill empty spots.");
    setBusy(true);
    try {
      const blob = await lineupPdf(lineup, doc.players, branded ? team : null, tier.watermark ? MADE_WITH : undefined);
      const name = lineupFileName(lineup);
      const file = new File([blob], name, { type: "application/pdf" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name }).catch(() => undefined);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast(share ? "Sharing isn't available in this browser, so the card downloaded instead." : "Lineup card downloaded.");
    } catch {
      toast("The lineup card couldn't be made. Try again, or use Print.");
    } finally {
      setBusy(false);
    }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (!doc.players.length)
    return (
      <div className="ro-empty">
        <h3>Add your roster first</h3>
        <p>A lineup is built from your players and their positions.</p>
        <button type="button" className="btn btn-primary" onClick={onRoster}>
          Go to the roster
        </button>
      </div>
    );

  return (
    <>
      <div className="ro-card ro-game">
        <div className="ro-game-pick">
          <label>
            <span>Lineup</span>
            <select className="select" value={lineup.id} onChange={(e) => change({ current: e.target.value })}>
              {doc.lineups.map((l) => (
                <option key={l.id} value={l.id}>
                  {[l.name, l.opponent ? `vs ${l.opponent}` : "", l.date ?? ""].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </label>
          <div className="ro-game-acts">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addLineup(false)}>
              New
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addLineup(true)}>
              Copy
            </button>
            <button type="button" className="btn btn-ghost btn-sm is-danger" onClick={() => (sure ? (setSure(false), deleteLineup()) : setSure(true))} onBlur={() => setSure(false)}>
              {sure ? "Tap again to delete" : "Delete"}
            </button>
          </div>
        </div>
        <div className="ro-add-row is-game">
          <label>
            <span>Name</span>
            <input className="input" value={lineup.name} onChange={(e) => setLineup({ name: e.target.value.slice(0, 60) })} />
          </label>
          <label>
            <span>Opponent</span>
            <input className="input" value={lineup.opponent ?? ""} onChange={(e) => setLineup({ opponent: e.target.value.slice(0, 60) })} placeholder="Central" />
          </label>
          <label>
            <span>Date</span>
            <input className="input" type="date" value={lineup.date ?? ""} onChange={(e) => setLineup({ date: e.target.value })} />
          </label>
        </div>
        <label className="ro-format">
          <span>Game</span>
          <select
            className="select"
            value={lineup.format}
            onChange={(e) => {
              const format = e.target.value as Format;
              // Spots that exist in both games keep their players.
              const keys = new Set(unitsFor(format).flatMap((u) => u.slots.map((s) => s.key)));
              setLineup({ format, slots: Object.fromEntries(Object.entries(lineup.slots).filter(([k]) => keys.has(k))) });
            }}
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <small>{FORMATS.find((f) => f.id === lineup.format)?.hint}</small>
        </label>
        <div className="ro-game-out">
          <button type="button" className="btn btn-primary" onClick={fill}>
            Fill empty spots
          </button>
          <button type="button" className="btn btn-ghost" onClick={print} disabled={busy}>
            <Icon name="print" size={15} /> Print card
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void pdf(false)} disabled={busy}>
            {busy ? "Making the PDF…" : "Download PDF"}
          </button>
          {canShare && (
            <button type="button" className="btn btn-ghost" onClick={() => void pdf(true)} disabled={busy}>
              Share
            </button>
          )}
          {filled > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLineup({ slots: {} })}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {hurt.length > 0 && (
        <p className="ro-warn" role="status">
          {hurt.map((p) => fullName(p)).join(", ")} {hurt.length === 1 ? "is" : "are"} marked injured or out but still in this lineup.
        </p>
      )}

      <div className="ro-units">
        {units.map((unit) => (
          <section key={unit.id} className={`ro-card ro-unit${unit.starting ? " is-start" : ""}`} aria-labelledby={`unit-${unit.id}`}>
            <h3 id={`unit-${unit.id}`}>
              {unit.name}
              {unit.starting && <span className="pill pill-cyan">Starts</span>}
            </h3>
            {unit.hint && <p className="ro-hint">{unit.hint}</p>}
            {unit.slots.map((slot) => {
              const id = lineup.slots[slot.key] ?? "";
              const p = byId.get(id);
              const also = p ? unitsOf(lineup, p.id).filter((n) => n !== unit.name) : [];
              const inUnit = new Set(unit.slots.map((s) => lineup.slots[s.key]).filter((x) => x && x !== id));
              return (
                <label key={slot.key} className={`ro-slot${p ? " is-set" : ""}`}>
                  <span className="ro-slot-label">{slot.label}</span>
                  <select className="select" value={id} onChange={(e) => setSlot(slot.key, e.target.value)}>
                    <option value="">— Empty —</option>
                    {rankFor(slot, doc.players).map((x) => (
                      <option key={x.id} value={x.id} disabled={inUnit.has(x.id)}>
                        {x.number ? `#${x.number} ` : ""}
                        {fullName(x)}
                        {x.pos.length ? ` (${posShort(x)})` : ""}
                        {x.status !== "active" ? ` · ${STATUSES.find((s) => s.id === x.status)?.label}` : ""}
                      </option>
                    ))}
                  </select>
                  {also.length > 0 && <small className="ro-also">Also: {also.join(", ")}</small>}
                </label>
              );
            })}
          </section>
        ))}
      </div>

      <section className="ro-card">
        <h3>Not in this lineup ({out.length})</h3>
        {out.length ? (
          <p className="ro-bench">{out.map((p) => `#${p.number || "–"} ${fullName(p)}`).join(" · ")}</p>
        ) : (
          <p className="ro-hint">Every ready player has a spot.</p>
        )}
        <label className="ro-note">
          <span>Notes on the card</span>
          <textarea className="textarea" rows={2} value={lineup.note ?? ""} onChange={(e) => setLineup({ note: e.target.value.slice(0, 400) })} placeholder="Ride on every save. #7 takes every face-off in the 4th." />
        </label>
      </section>

      <p className="ro-hint">
        Put names on your diagrams: open a play in the <Link to="/build">Designer</Link>, tap Labels, then Fill names from the lineup.
      </p>

      {/* The card that prints. Always on the page (hidden on screen), so Print never opens an empty sheet. */}
      <article className="ro-print" aria-hidden="true">
        {branded ? <PrintTeam tier={tier} /> : <div className="ro-print-band">Lineup card</div>}
        <header>
          <h1>{lineup.name}</h1>
          <p>
            {[lineup.opponent ? `vs ${lineup.opponent}` : "", lineup.date ? new Date(`${lineup.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "", FORMATS.find((f) => f.id === lineup.format)?.label]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
        <div className="ro-print-grid">
          <div className="ro-print-units">
            {units.map((unit) => {
              const rows = unit.starting ? unit.slots : unit.slots.filter((s) => lineup.slots[s.key]);
              if (!rows.length) return null;
              return (
                <table key={unit.id}>
                  <caption>{unit.name}</caption>
                  <tbody>
                    {rows.map((slot) => {
                      const p = byId.get(lineup.slots[slot.key] ?? "");
                      return (
                        <tr key={slot.key}>
                          <th scope="row">{slot.label}</th>
                          <td className="n">{p?.number ? `#${p.number}` : ""}</td>
                          <td>{p ? fullName(p) : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })}
          </div>
          <table className="ro-print-roster">
            <caption>Roster</caption>
            <tbody>
              {[...doc.players].sort(byNumber).map((p) => (
                <tr key={p.id}>
                  <td className="n">{p.number ? `#${p.number}` : ""}</td>
                  <td>{fullName(p)}</td>
                  <td className="pos">{p.status !== "active" ? STATUSES.find((s) => s.id === p.status)?.label : posShort(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lineup.note && <p className="ro-print-note">{lineup.note}</p>}
        {tier.watermark && <p className="ro-print-made">{MADE_WITH}</p>}
      </article>
    </>
  );
}
