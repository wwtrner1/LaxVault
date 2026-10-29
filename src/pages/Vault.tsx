import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Tooltip } from "../components/Tooltip";
import { PlayThumb } from "../components/PlayThumb";
import { ExportDialog } from "../components/ExportDialog";
import { Modal } from "../components/Modal";
import { store, useStore } from "../lib/store";
import { api, toStoredPlay } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTier } from "../lib/tier";
import { gatePlaybook, gateSave } from "../lib/plan";
import { savePlays } from "../lib/vaultSave";
import { useToast } from "../lib/toast";
import { track } from "../lib/track";
import { FORMATIONS, uid } from "../lib/types";
import { LAX_FIELDS_ON } from "../lib/fieldSpec";
import { LAX_SET_NAMES } from "../lib/laxSets";
import { PLAY_TYPES, playTypeInfo } from "../lib/playTypes";
import { recolorScene, staleCount } from "../lib/recolor";
import { applyFormat, usePlayFormat } from "../lib/playFormat";
import { FormatPanel } from "../components/FormatPanel";
import { STARTER_PLAYS } from "../lib/starters";
import type { Scene } from "../lib/types";
import "../styles/vault.css";
import type { StoredPlay } from "../lib/types";

type Sort = "recent" | "name" | "formation" | "popular";

const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Newest first" },
  { id: "name", label: "Play name A–Z" },
  { id: "formation", label: "Set" },
  { id: "popular", label: "Most copied" },
];

export function Vault() {
  const navigate = useNavigate();
  const toast = useToast();
  const tier = useTier();
  const { account } = useAuth();
  const plays = useStore((s) => s.plays);
  const playbooks = useStore((s) => s.playbooks);

  const [tab, setTab] = useState<"mine" | "starter" | "public">("mine");
  const [query, setQuery] = useState("");
  const [formation, setFormation] = useState("");
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [picked, setPicked] = useState<string[]>([]);
  const [remote, setRemote] = useState<StoredPlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addingTo, setAddingTo] = useState(false);

  // Pull the shared Vault, and merge the coach's own cloud plays once signed in.
  useEffect(() => {
    if (tab === "starter") return;
    let alive = true;
    setLoading(true);
    api
      .listPlays(tab === "public" ? { scope: "public" } : { scope: "mine" })
      .then((res) => {
        if (!alive) return;
        const mapped = res.plays.map(toStoredPlay);
        if (tab === "public") setRemote(mapped);
        else store.mergeRemotePlays(mapped);
      })
      .catch(() => {
        /* offline or not signed in — the local Vault still works */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, account]);

  const source = tab === "mine" ? plays : tab === "starter" ? STARTER_PLAYS : remote;

  // "starter" shows as the Starter badge on the card, not as a label chip (canvas).
  const tags = useMemo(
    () => [...new Set(source.flatMap((p) => p.tags))].filter((t) => t !== "starter").sort().slice(0, 18),
    [source],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = source.filter((p) => {
      if (formation && p.formation !== formation) return false;
      if (type && p.playType !== type) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (!q) return true;
      return [p.name, p.formation, p.description, p.personnel, ...p.tags].join(" ").toLowerCase().includes(q);
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "formation") return (a.formation || "zzz").localeCompare(b.formation || "zzz");
      if (sort === "popular") return b.saveCount - a.saveCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [source, query, formation, type, tag, sort]);

  const pickedPlays = useMemo(() => shown.filter((p) => picked.includes(p.id)), [shown, picked]);
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function copyToMine(play: StoredPlay) {
    // A copy is a new play, so it counts toward the plan's Vault size like any save.
    const gate = gateSave(tier, plays.length);
    if (!gate.ok) {
      toast(gate.reason, true);
      navigate("/pricing");
      return;
    }
    const local: StoredPlay = {
      ...play,
      id: uid("play"),
      isPublic: false,
      remote: false,
      ownerName: account?.name ?? "You",
      name: play.id.startsWith("starter-") ? play.name : `${play.name} (copy)`,
      tags: play.tags.filter((t) => t !== "starter"),
      updatedAt: new Date().toISOString(),
    };
    if (play.id.startsWith("starter-")) {
      toast(`${play.name} copied into your Vault. Open it to make it yours.`);
      await savePlays([local], { playbook: null, signedIn: !!account });
      return;
    }
    store.upsertPlay(local);
    toast(`${play.name} copied into your Vault. Edit it however you want.`);
    if (account && play.remote) {
      try {
        const res = await api.copyPlay(play.id);
        store.removePlay(local.id);
        store.upsertPlay(toStoredPlay(res.play));
      } catch {
        /* the local copy is already saved */
      }
    }
  }

  /** Every starter play the coach hasn't copied yet, filed in one "Starter plays" playbook. */
  async function copyAllStarters() {
    const mine = new Set(plays.map((p) => p.name));
    const todo = STARTER_PLAYS.filter((p) => !mine.has(p.name));
    if (!todo.length) return toast("Every starter play is already in your Vault.");
    const room = tier.playLimit - plays.length;
    if (room < todo.length) {
      toast(`Your ${tier.name} Vault has room for ${Math.max(0, room)} more ${room === 1 ? "play" : "plays"}. Copy the ones you want one at a time, or move up a plan.`, true);
      return;
    }
    const hasBook = playbooks.some((b) => b.name.toLowerCase() === "starter plays");
    const bookGate = gatePlaybook(tier, playbooks.length);
    const now = new Date().toISOString();
    const copies = todo.map((p) => ({ ...p, id: uid("play"), ownerName: account?.name ?? "You", tags: p.tags.filter((t) => t !== "starter"), updatedAt: now }));
    toast(`${copies.length} starter plays copied into your Vault${hasBook || bookGate.ok ? ", in the Starter plays playbook" : ""}.`);
    await savePlays(copies, { playbook: hasBook || bookGate.ok ? "Starter plays" : null, signedIn: !!account });
  }

  async function remove(play: StoredPlay) {
    store.removePlay(play.id);
    setPicked((list) => list.filter((x) => x !== play.id));
    toast(`${play.name || "Play"} deleted.`);
    if (account && play.remote) {
      try {
        await api.deletePlay(play.id);
      } catch {
        /* already gone */
      }
    }
  }

  // Saved play format: "Format on · click a play", from the canvas.
  const { format, parts } = usePlayFormat();
  const [painting, setPainting] = useState(false);
  const [lastPainted, setLastPainted] = useState<{ id: string; name: string; scene: Scene } | null>(null);

  async function savePlayScene(p: StoredPlay, scene: Scene) {
    const next = { ...p, scene, updatedAt: new Date().toISOString() };
    store.upsertPlay(next);
    if (account && p.remote) {
      try {
        await api.updatePlay(p.id, { scene });
      } catch {
        /* the local copy is already updated; it syncs on the next save */
      }
    }
  }

  function paint(p: StoredPlay) {
    if (!format || !parts.length) return;
    setLastPainted({ id: p.id, name: p.name, scene: p.scene });
    void savePlayScene(p, applyFormat(p.scene, format, parts));
    toast(`${p.name || "That play"} now uses the ${format.sourceName} format.`);
  }

  function undoPaint() {
    const p = lastPainted && plays.find((x) => x.id === lastPainted.id);
    if (!p || !lastPainted) return;
    void savePlayScene(p, lastPainted.scene);
    setLastPainted(null);
    toast(`${lastPainted.name || "That play"} is back the way it was.`);
  }

  // Plays saved before the new default position colors (Sep 25).
  const stale = useMemo(() => plays.filter((p) => staleCount(p.scene) > 0), [plays]);

  async function updateColors() {
    const updated = stale.map((p) => ({ ...p, scene: recolorScene(p.scene), updatedAt: new Date().toISOString() }));
    updated.forEach((p) => store.upsertPlay(p));
    toast(`${updated.length} ${updated.length === 1 ? "play uses" : "plays use"} the new position colors.`);
    if (account) {
      for (const p of updated.filter((x) => x.remote)) {
        try {
          await api.updatePlay(p.id, { scene: p.scene });
        } catch {
          /* the local copy is already updated; it syncs on the next save */
        }
      }
    }
  }

  const clearFilters = () => (setQuery(""), setFormation(""), setType(""), setTag(""));
  const filtered = Boolean(query || formation || type || tag);

  return (
    <Shell
      title="The Vault"
      actions={
        <>
          <Link to="/build" className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Draft a play
          </Link>
        </>
      }
    >
      <div className="page">
        <div className="tab-row" style={{ maxWidth: 520 }} role="group" aria-label="Which plays to show">
          <button
            type="button"
            aria-pressed={tab === "mine"}
            className={tab === "mine" ? "is-on" : ""}
            onClick={() => (setTab("mine"), setPicked([]))}
          >
            Your plays ({plays.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === "starter"}
            className={tab === "starter" ? "is-on" : ""}
            onClick={() => (setTab("starter"), setPicked([]))}
          >
            Starter plays ({STARTER_PLAYS.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === "public"}
            className={tab === "public" ? "is-on" : ""}
            onClick={() => (setTab("public"), setPicked([]))}
          >
            Shared by coaches
          </button>
        </div>

        {tab === "starter" && (
          <div className="vault-note" role="note">
            <div>
              <b>Sets, slides, clears and restarts to start from.</b>
              <p>Copy a play into your Vault to change the letters, add your own cuts or put it in a playbook. Print or export any of them as they are.</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={copyAllStarters}>
              Copy all to my Vault
            </button>
          </div>
        )}

        {tab === "mine" && stale.length > 0 && (
          <div className="vault-note" role="status">
            <div>
              <b>
                {stale.length} {stale.length === 1 ? "play still uses" : "plays still use"} the old player colors.
              </b>
              <p>
                Update them to the new position colors: Q black · C cyan · X blue · Y red · Z green · H orange · S light purple.
                Only players still in an old default color change; colors you picked yourself stay.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={updateColors}>
              Update {stale.length} {stale.length === 1 ? "play" : "plays"}
            </button>
          </div>
        )}

        {tab === "mine" && format && (
          <div className={`vault-format${painting ? " is-on" : ""}`}>
            <div className="vault-format-head">
              <b>Saved play format</b>
              <button type="button" className={`btn btn-sm ${painting ? "btn-primary" : "btn-ghost"}`} aria-pressed={painting} onClick={() => setPainting((v) => !v)}>
                {painting ? "Format on · click a play" : "Format plays"}
              </button>
              {lastPainted && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={undoPaint}>
                  Undo {lastPainted.name || "last"}
                </button>
              )}
            </div>
            {painting && <FormatPanel />}
          </div>
        )}

        <div className="filters">
          <div className="search-box">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search play names, sets, labels"
              aria-label="Search the Vault"
            />
          </div>
          <select className="select" style={{ width: 160 }} value={formation} onChange={(e) => setFormation(e.target.value)} aria-label="Filter by set">
            <option value="">{LAX_FIELDS_ON ? "All sets" : "All formations"}</option>
            {(LAX_FIELDS_ON ? LAX_SET_NAMES : FORMATIONS).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 132 }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {PLAY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <Tooltip title="Sort" hint="Reorders the Vault. Sorting never changes what is in it." side="bottom">
            <select className="select" style={{ width: 160 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Tooltip>
          {filtered && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <div className="chip-row" style={{ marginBottom: 18 }}>
            {tags.map((t) => (
              <button key={t} type="button" className={`chip${tag === t ? " is-on" : ""}`} onClick={() => setTag(tag === t ? "" : t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        {loading && shown.length === 0 && (
          <div className="play-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 232 }} />
            ))}
          </div>
        )}

        {!loading && shown.length === 0 && (
          <div className="empty">
            <Icon name="folder" size={44} />
            {tab === "mine" ? (
              <>
                <h2>{filtered ? "Nothing matches that" : "Your Vault is empty"}</h2>
                <p>
                  {filtered
                    ? "Try a shorter search, or clear the filters to see everything you have drawn."
                    : "Draw your first play and it lands here. Every play you save is searchable by name, set and label."}
                </p>
                {filtered ? (
                  <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 9, justifyContent: "center" }}>
                    <Link to="/build" className="btn btn-primary">
                      Draft your first play
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2>No shared plays yet</h2>
                <p>When coaches make a play public it shows up here for anyone to copy and adapt. Be the first.</p>
                <Link to="/build" className="btn btn-primary">
                  Draft a play to share
                </Link>
              </>
            )}
          </div>
        )}

        {shown.length > 0 && (
          <div className="play-grid">
            {shown.map((p) => (
              <article key={p.id} className={`card play-card${picked.includes(p.id) ? " is-picked" : ""}`}>
                <button
                  type="button"
                  className={`play-pick${picked.includes(p.id) ? " is-on" : ""}`}
                  onClick={() => toggle(p.id)}
                  aria-label={`Select ${p.name}`}
                  aria-pressed={picked.includes(p.id)}
                >
                  <Icon name="check" size={14} />
                </button>
                {painting && tab === "mine" ? (
                  <button type="button" className="play-thumb is-paint" onClick={() => paint(p)} aria-label={`Give ${p.name || "this play"} the saved format`}>
                    <PlayThumb scene={p.scene} label={p.name} />
                  </button>
                ) : (
                  <div className="play-thumb">
                    <PlayThumb scene={p.scene} label={p.name} />
                  </div>
                )}
                <div className="play-body">
                  <h3>{p.name || "Untitled play"}</h3>
                  <p className="hint" style={{ margin: 0 }}>
                    {p.formation || (LAX_FIELDS_ON ? "No set" : "No formation")} · {playTypeInfo(p.playType).label}
                    {tab === "public" && ` · ${p.ownerName}`}
                  </p>
                  <div className="play-meta">
                    {p.tags.includes("starter") && <span className="pill pill-special">Starter</span>}
                    {p.tags
                      .filter((t) => t !== "starter")
                      .slice(0, 3)
                      .map((t) => (
                        <span key={t} className="pill pill-label">
                          {t}
                        </span>
                      ))}
                    {p.saveCount > 0 && <span className="pill pill-cyan">{p.saveCount} copies</span>}
                    {!p.remote && <span className="pill pill-amber">This browser</span>}
                  </div>
                  <div className="play-acts">
                    {tab === "mine" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/build/${p.id}`)}
                          aria-label={`Open ${p.name} in the designer`}
                        >
                          <Icon name="pencil" size={13} /> Open
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => (setPicked([p.id]), setExporting(true))}
                          aria-label={`Export ${p.name}`}
                        >
                          <Icon name="download" size={13} /> Export
                        </button>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}>
                          <Icon name="trash" size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => copyToMine(p)}
                          aria-label={`Copy ${p.name} to your Vault`}
                        >
                          <Icon name="copy" size={13} /> Copy to my Vault
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => (setPicked([p.id]), setExporting(true))}
                          aria-label={`Export or print ${p.name}`}
                        >
                          <Icon name="print" size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {picked.length > 0 && (
          <div className="bulk-bar" role="group" aria-label="Selected plays">
            <span className="sr-only" role="status" aria-live="polite">
              {picked.length} play{picked.length === 1 ? "" : "s"} selected
            </span>
            <b aria-hidden="true">{picked.length}</b>
            <span aria-hidden="true">play{picked.length === 1 ? "" : "s"} selected</span>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingTo(true)}>
              <Icon name="folder" size={14} /> Add to playbook
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setExporting(true)}>
              <Icon name="print" size={14} /> Export or print
            </button>
            <button type="button" className="btn btn-quiet btn-sm" style={{ color: "#fff" }} onClick={() => setPicked([])}>
              Clear
            </button>
          </div>
        )}
      </div>

      {exporting && pickedPlays.length > 0 && (
        <ExportDialog
          plays={pickedPlays}
          tier={tier}
          onClose={() => setExporting(false)}
          onUpgrade={() => navigate("/pricing")}
          onDone={(kind) => {
            track("play_exported", { kind, count: pickedPlays.length });
            toast(`${pickedPlays.length} play${pickedPlays.length === 1 ? "" : "s"} exported.`);
          }}
        />
      )}

      {addingTo && (
        <Modal title="Add to a playbook" onClose={() => setAddingTo(false)}>
          {playbooks.length === 0 ? (
            <>
              <p className="lede">You have no playbooks yet. A playbook is just a folder with an install order.</p>
              <Link to="/playbooks" className="btn btn-primary" style={{ marginTop: 14 }}>
                Build your first playbook
              </Link>
            </>
          ) : (
            <div className="size-list">
              {playbooks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="size-opt"
                  onClick={() => {
                    store.upsertPlaybook({ ...b, playIds: [...new Set([...b.playIds, ...picked])] });
                    setAddingTo(false);
                    setPicked([]);
                    toast(`Added to ${b.name}.`);
                  }}
                >
                  <span className="radio-dot" />
                  <span>
                    <strong>{b.name}</strong>
                    <small>{b.playIds.length} plays</small>
                  </span>
                  <span className="dim">Add {picked.length}</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </Shell>
  );
}
