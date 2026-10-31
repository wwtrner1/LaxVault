import { useEffect, useState } from "react";
import { getSettings } from "@netlify/identity";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { authMessage, useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import { STARTER_DRILLS, STARTER_PLANS, STARTER_PLAYS } from "../lib/starters";

type Tab = "in" | "up" | "reset";
type Provider = "google" | "github";
const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
];


export function SignIn() {
  const { account, status, available, signIn, signUp, signOut, sendReset, startOAuth } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Where to go after signing in: an in-app path only (an invite link sends ?next=/join/…).
  const next = /^\/(?!\/)/.test(params.get("next") ?? "") ? params.get("next")! : "/vault";
  const localPlays = useStore((s) => s.plays.length);

  const [tab, setTab] = useState<Tab>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Only the providers switched on in Netlify Identity: a button for one that's off ends on Identity's raw error page.
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    if (!available) return;
    getSettings()
      .then((s) => setProviders(PROVIDERS.filter((p) => s.providers?.[p.id]).map((p) => p.id)))
      .catch(() => setProviders([]));
  }, [available]);

  useEffect(() => {
    setError(null);
    setNotice(null);
  }, [tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (tab === "in") {
        await signIn(email.trim(), password);
        navigate(next);
      } else if (tab === "up") {
        if (password.length < 8) throw new Error("short-password");
        const message = await signUp(email.trim(), password, name.trim() || "Coach");
        setNotice(message);
      } else {
        await sendReset(email.trim());
        setNotice("Reset link sent. Check your inbox — it expires in an hour.");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "short-password"
          ? "Use at least 8 characters. A short phrase beats a clever word."
          : authMessage(err),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-art">
        <Link to="/" className="auth-logo">
          <img src="/brand/lockup-stacked.webp" width={260} height={260} alt="LaxVault: Practice · Plan · Play" />
        </Link>
        <p className="auth-art-lead">Your playbook, on every device you coach from.</p>
        <p>
          Sign in and your plays follow you — laptop on Sunday night, tablet on the sideline, phone in the
          huddle. Everything you have drawn in this browser comes with you.
        </p>
        <ul className="auth-points">
          <li>
            <Icon name="check" size={14} /> Free to start, no card. Paid plans have a 14-day money-back guarantee
          </li>
          <li>
            <Icon name="check" size={14} /> {STARTER_DRILLS.length} starter drills, {STARTER_PLAYS.length} plays and {STARTER_PLANS.length} practice plans
          </li>
          <li>
            <Icon name="check" size={14} /> Print drills and practice plans
          </li>
        </ul>
      </aside>

      <main className="auth-panel">
        {account ? (
          <div className="auth-card">
            <h1>You are signed in</h1>
            <p className="auth-sub">
              Signed in as <b>{account.email}</b>.
            </p>
            <div className="auth-actions">
              <Link to="/vault" className="btn btn-primary btn-block">
                Go to your Vault
              </Link>
              <Link to="/build" className="btn btn-ghost btn-block">
                Draw a play
              </Link>
              <button type="button" className="btn btn-quiet btn-block" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-card">
            <div className="tab-row" role="group" aria-label="Sign in or create an account">
              <button type="button" aria-pressed={tab === "in"} className={tab === "in" ? "is-on" : ""} onClick={() => setTab("in")}>
                Sign in
              </button>
              <button type="button" aria-pressed={tab === "up"} className={tab === "up" ? "is-on" : ""} onClick={() => setTab("up")}>
                Create account
              </button>
            </div>

            <h1>
              {tab === "in" ? "Welcome back, Coach" : tab === "up" ? "Start your playbook" : "Reset your password"}
            </h1>
            <p className="auth-sub">
              {tab === "in"
                ? "Pick up where you left off."
                : tab === "up"
                  ? localPlays > 0
                    ? `The ${localPlays} ${localPlays === 1 ? "play" : "plays"} you drew in this browser move into your account.`
                    : "Free to start, no card needed."
                  : "Enter the email you signed up with and we will send a link."}
            </p>

            {!available && (
              <div className="lock-note">
                <Icon name="lock" size={15} />
                <div>
                  <b>Accounts are not switched on for this site yet.</b>
                  <span>Everything you draw still saves in this browser — you just cannot sync it across devices.</span>
                </div>
              </div>
            )}

            <form onSubmit={submit} noValidate>
              {tab === "up" && (
                <label className="field">
                  <span>Your name</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Coach Reyes"
                    autoComplete="name"
                  />
                  <small className="hint">Shows on plays you share with your staff.</small>
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@yourteam.org"
                  autoComplete="email"
                  required
                />
              </label>
              {tab !== "reset" && (
                <label className="field">
                  <span>Password</span>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "up" ? "At least 8 characters" : "Your password"}
                    autoComplete={tab === "up" ? "new-password" : "current-password"}
                    required
                  />
                  {tab === "up" && <small className="hint">Eight characters or more. A short phrase works well.</small>}
                </label>
              )}

              <div role="alert">
                {error && (
                  <p className="error-line">
                    <Icon name="close" size={14} /> {error}
                  </p>
                )}
              </div>
              <div role="status" aria-live="polite">
                {notice && (
                  <p className="ok-line">
                    <Icon name="check" size={14} /> {notice}
                  </p>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy || !available}>
                {busy
                  ? tab === "in"
                    ? "Signing you in…"
                    : tab === "up"
                      ? "Creating your account…"
                      : "Sending the link…"
                  : tab === "in"
                    ? "Sign in"
                    : tab === "up"
                      ? "Create my account"
                      : "Send the reset link"}
              </button>
              {tab === "up" && (
                <small className="hint">
                  Accounts are for coaches 18 and older. Creating one means you agree to the <Link to="/terms">Terms of Use</Link>{" "}
                  and <Link to="/privacy">Privacy Policy</Link>.
                </small>
              )}
            </form>

            {tab === "in" && (
              <button type="button" className="btn btn-quiet btn-block btn-sm" onClick={() => setTab("reset")}>
                Forgot your password?
              </button>
            )}
            {tab === "reset" && (
              <button type="button" className="btn btn-quiet btn-block btn-sm" onClick={() => setTab("in")}>
                Back to sign in
              </button>
            )}

            {tab !== "reset" && available && providers.length > 0 && (
              <>
                <div className="divider">
                  <span>or</span>
                </div>
                <div className="oauth-row">
                  {PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => (
                    <button key={p.id} type="button" className="btn btn-ghost btn-block" onClick={() => startOAuth(p.id)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="auth-skip">
              Not ready yet? <Link to="/build">Draw a play without an account</Link> — it saves in this
              browser and moves over when you sign up.
            </p>
            <p className="hint" role="status" aria-live="polite">
              {status === "loading" ? "Checking your session…" : ""}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
