import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Status = {
  on: boolean;
  secretKey: "live" | "test" | "wrong" | null;
  adminKey: boolean;
  webhookSecret: boolean;
  portal: boolean;
  pricesFrom: "env" | "app" | null;
  prices: { key: string; set: boolean }[];
  selfServe: boolean;
  webhookUrl: string;
};
type Setup = { prices: Record<string, string>; created: string[]; reused: string[]; livemode: boolean; env: string; webhook: string; portal: string };

const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
];
const NETLIFY_ENV = "https://app.netlify.com/projects/lax-vault/configuration/env";

/**
 * Billing go-live, step by step. Shows which Stripe keys the site has (never
 * their values) and what the app set up on its own (prices, webhook). The one
 * key is entered in Netlify, not here.
 */
export function BillingTab() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .admin<Status>("billing")
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : "Billing status didn't load."));
  useEffect(() => void load(), []);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setResult(await api.admin<Setup>("billing/setup", { method: "POST", body: "{}" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup didn't run.");
    } finally {
      setBusy(false);
    }
  };

  if (!status) return error ? <p className="adm-note adm-bad">{error}</p> : <p className="hint">Loading billing…</p>;
  const tick = (ok: boolean) => (ok ? "✓" : "○");
  const allPrices = status.prices.every((p) => p.set);

  return (
    <div className="adm-bill">
      <p className={`adm-note${status.on ? "" : " adm-bad"}`}>
        {status.on
          ? `Billing is on${status.secretKey === "test" ? " in Stripe test mode: no real cards are charged" : ""}. Plan buttons go to Stripe Checkout.`
          : "Billing is off. Coaches switch plans themselves until the steps below are done."}
      </p>

      <ol className="adm-steps">
        <li>
          <b>{tick(Boolean(status.secretKey) && status.secretKey !== "wrong")} Secret key, the only paste.</b> In Stripe, Developers → API keys → reveal the secret key. In{" "}
          <a href={NETLIFY_ENV} target="_blank" rel="noreferrer">Netlify environment variables</a>, add it as <code>STRIPE_SECRET_KEY</code> (mark it secret), then
          redeploy. A test key (<code>sk_test_…</code>) charges no real cards.
          {status.secretKey === "wrong"
            ? " The saved value isn't a secret key: it should start sk_live_ or sk_test_ (an mk_ value is the key's id). Billing stays off until it's replaced and the site redeployed."
            : status.secretKey && ` Set (${status.secretKey}).`}
        </li>
        <li>
          <b>{tick(allPrices)} Products and prices.</b> The live app makes them in Stripe on its first visit after the deploy and keeps the ids
          {status.pricesFrom === "env" ? " (from STRIPE_PRICES)" : status.pricesFrom === "app" ? " (made by the app)" : ""}. {status.prices.map((p) => `${p.set ? "✓" : "○"} ${p.key}`).join(" · ")}
        </li>
        <li>
          <b>{tick(status.webhookSecret)} Webhook.</b> The app adds <code>{status.webhookUrl}</code> to Stripe with the events it needs ({EVENTS.length}) and keeps its signing secret.
        </li>
        <li>
          <b>{tick(status.portal)} Manage billing page.</b> The app sets up Stripe's customer portal: cancel at the end of the period (with a reason), change card,
          receipts, and switching between Coach and Staff, monthly or yearly.
        </li>
        <li>
          <b>Run again.</b> Safe any time; it reuses what's there and makes only what's missing, such as a new price after one changes.
          <div className="chip-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={(!status.secretKey && !status.adminKey) || busy} onClick={run}>
              {busy ? "Running…" : "Run Stripe setup"}
            </button>
          </div>
          {result && (
            <div className="adm-card">
              <p>
                {result.livemode ? "Live mode." : "Test mode."} Created {result.created.length}, reused {result.reused.length}.
                {result.webhook === "made" ? " Webhook made." : result.webhook === "kept" ? " Webhook already in place." : result.webhook === "env" ? " Webhook secret comes from Netlify." : result.webhook === "preview" ? " Webhook is only made from app.lax-vault.com." : ` ${result.webhook}`}
                {result.portal === "ready" ? " Manage billing page ready." : ` ${result.portal}`}
              </p>
            </div>
          )}
        </li>
        <li>
          <b>{tick(!status.selfServe)} Close the beta switcher.</b> Once a test checkout works, set <code>PLAN_SELF_SERVE</code> = <code>false</code> in Netlify and redeploy.
        </li>
      </ol>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
        Check again
      </button>
      {error && <p className="adm-note adm-bad">{error}</p>}
    </div>
  );
}
