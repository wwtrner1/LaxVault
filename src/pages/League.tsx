import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Shell } from "../components/Shell";
import { api, type LeagueView } from "../lib/api";
import { useAuth } from "../lib/auth";
import { syncPlan, useBilling, goToBilling } from "../lib/tier";
import { useToast } from "../lib/toast";

const PENDING = "laxvault.join.v1";

/** Mounted in App: once a coach who opened an invite link is signed in, take them back to it. */
export function PendingJoin() {
  const { account } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!account) return;
    let token = "";
    try {
      token = localStorage.getItem(PENDING) ?? "";
    } catch {
      return;
    }
    if (token && !window.location.pathname.startsWith("/join/")) navigate(`/join/${encodeURIComponent(token)}`);
  }, [account, navigate]);
  return null;
}

const inviteUrl = (token: string) => `https://app.lax-vault.com/join/${encodeURIComponent(token)}`;

/**
 * League pack: the coach who pays sees the invite link and who has joined;
 * a coach in a league sees whose it is. Members get Coach while it's live.
 */
export function League() {
  const { account } = useAuth();
  const toast = useToast();
  const billing = useBilling();
  const [view, setView] = useState<LeagueView | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!account) return;
    api
      .league()
      .then((v) => {
        setView(v);
        if (v.role !== "none") setName(v.name);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "The league didn't load. Try again in a minute."));
  }, [account]);

  const act = async (run: () => Promise<LeagueView>, done: string) => {
    try {
      setView(await run());
      toast(done);
    } catch (e) {
      toast(e instanceof Error ? e.message : "That didn't work. Try again in a minute.", true);
    }
  };

  return (
    <Shell title="League">
      <div className="page-head">
        <div>
          <h2>League pack</h2>
          <p>One plan for a whole club or league: up to 15 coaches, each with Coach, for $199 a year. Coaches join with your invite link.</p>
        </div>
      </div>

      {!account && (
        <section className="card">
          <p>Sign in to run a league or see the one you're in.</p>
          <Link to="/signin" className="btn btn-primary">
            Sign in
          </Link>
        </section>
      )}
      {error && <p className="pr-notice" role="alert">{error}</p>}

      {view?.role === "none" && (
        <section className="card">
          <h3>Run a league</h3>
          <p>Buy the League pack, then send your link to the coaches in your club. Each one gets every Coach tool on their own account, and their drills and plays stay theirs.</p>
          {billing ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goToBilling("league_year").catch((e) => toast(e instanceof Error ? e.message : "Stripe didn't open.", true))}
            >
              Buy the League pack, $199 a year
            </button>
          ) : (
            <p className="hint">League packs aren't on sale on this site yet.</p>
          )}
          <p className="hint">14-day money-back guarantee: ask within 14 days of paying and we refund it in full.</p>
          <p className="hint">Got an invite link from your league? Open it and you'll join.</p>
        </section>
      )}

      {view?.role === "member" && (
        <section className="card">
          <h3>{view.name || "Your league"}</h3>
          <p>
            You're a coach in {view.ownerName ? `${view.ownerName}'s` : "a"} league. {view.active ? "Coach is included, so every tool is on." : "Its plan isn't active right now, so you're on your own plan."}
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (account && window.confirm("Leave this league? You keep your drills and plays; Coach tools go back to your own plan.")) void act(() => api.removeLeagueMember(account.id), "You left the league.");
            }}
          >
            Leave the league
          </button>
        </section>
      )}

      {view?.role === "owner" && (
        <>
          <section className="card">
            <div className="card-head">
              <h3>{view.name || "Your league"}</h3>
              <span className={`pill${view.active ? " pill-cyan" : " pill-amber"}`}>{view.active ? "Active" : "Not active"}</span>
            </div>
            <label className="field">
              <span>League name, shown to your coaches</span>
              <div className="chip-row">
                <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Riverside Youth Lacrosse" style={{ flex: "1 1 240px" }} />
                <button type="button" className="btn btn-ghost" onClick={() => act(() => api.renameLeague(name), "Saved.")}>
                  Save
                </button>
              </div>
            </label>
            <p>
              <b>
                {view.used} of {view.seats}
              </b>{" "}
              seats used, yours included.
            </p>
            {view.invite ? (
              <div className="field">
                <span>Invite link</span>
                <div className="chip-row">
                  <input className="input" readOnly value={inviteUrl(view.invite)} aria-label="League invite link" onFocus={(e) => e.currentTarget.select()} style={{ flex: "1 1 260px" }} />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(inviteUrl(view.invite!))
                        .then(() => toast("Invite link copied. Send it to your coaches."))
                        .catch(() => toast("Copy didn't work here. Press and hold the link to copy it.", true))
                    }
                  >
                    Copy link
                  </button>
                </div>
                <small className="hint">Anyone with this link can take a seat, so send it to your coaches only. Remove a coach below to free their seat.</small>
              </div>
            ) : (
              <p className="hint">The invite link shows here while the League pack is paid up. Check Manage billing on your account page.</p>
            )}
          </section>

          <section className="card">
            <h3>Coaches</h3>
            {view.members.length ? (
              <ul className="lg-list">
                {view.members.map((m) => (
                  <li key={m.id}>
                    <span>
                      <b>{m.name || m.email || "Coach"}</b>
                      {m.name && m.email && <small> · {m.email}</small>}
                    </span>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => {
                        if (window.confirm(`Remove ${m.name || m.email || "this coach"}? They keep their drills and plays.`)) void act(() => api.removeLeagueMember(m.id), "Removed. That seat is free.");
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Nobody has joined yet. Send the link above.</p>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}

/** /join/:token — the invite link. Signs the coach into the league and sends them to it. */
export function JoinLeague() {
  const { token = "" } = useParams();
  const { account } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState("");
  const tried = useRef(false);

  useEffect(() => {
    if (!account) {
      // A new coach confirms their email first; the invite waits in this browser until they're in.
      try {
        localStorage.setItem(PENDING, token);
      } catch {
        /* the coach opens the link again after signing in */
      }
      return;
    }
    if (tried.current) return;
    tried.current = true;
    try {
      localStorage.removeItem(PENDING);
    } catch {
      /* nothing to clear */
    }
    api
      .joinLeague(token)
      .then(async () => {
        const me = await api.me().catch(() => null);
        if (me?.plan) await syncPlan(me.plan, me.trialEndsAt);
        toast("You're in the league. Every Coach tool is on.");
        navigate("/league", { replace: true });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "That invite didn't work. Try again in a minute."));
  }, [account, token, navigate, toast]);

  return (
    <Shell title="Join a league">
      <div className="page-head">
        <div>
          <h2>Join a league</h2>
          <p>Your league covers Coach for you. Sign in or make a free account, and you'll join on this page.</p>
        </div>
      </div>
      {error ? (
        <p className="pr-notice" role="alert">{error}</p>
      ) : account ? (
        <p role="status">Joining…</p>
      ) : (
        <section className="card">
          <p>Sign in first. Then open this link again, or come back to this page.</p>
          <Link to={`/signin?next=${encodeURIComponent(`/join/${token}`)}`} className="btn btn-primary">
            Sign in or make an account
          </Link>
        </section>
      )}
    </Shell>
  );
}
