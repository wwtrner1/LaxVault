import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Status = {
  on: boolean;
  secretKey: "live" | "test" | "set" | null;
  adminKey: boolean;
  webhookSecret: boolean;
  prices: { key: string; set: boolean }[];
  selfServe: boolean;
  webhookUrl: string;
};
type Setup = { prices: Record<string, string>; created: string[]; reused: string[]; livemode: boolean; env: string };

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
 * their values), runs the catalogue setup and hands back STRIPE_PRICES ready
 * to paste. Keys are entered in Netlify, not here.
 */
export function BillingTab() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

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
  const copy = (what: string, text: string) =>
    navigator.clipboard.writeText(text).then(
      () => setCopied(what),
      () => setCopied(""),
    );

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
          <b>{tick(status.adminKey)} Setup key.</b> In Stripe, Developers → API keys → Create restricted key with <i>Products</i> and <i>Prices</i> set to Write. In{" "}
          <a href={NETLIFY_ENV} target="_blank" rel="noreferrer">Netlify environment variables</a>, add it as <code>STRIPE_ADMIN_KEY</code> (secret), then redeploy.
        </li>
        <li>
          <b>{tick(Boolean(result) || allPrices)} Make the prices.</b> Creates the products and prices from <code>setup.ts</code>. Safe to run again; it reuses what's there.
          <div className="chip-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={!status.adminKey || busy} onClick={run}>
              {busy ? "Running…" : "Run Stripe setup"}
            </button>
          </div>
          {result && (
            <div className="adm-card">
              <p>
                {result.livemode ? "Live mode." : "Test mode."} Created {result.created.length}, reused {result.reused.length}. Add this as <code>STRIPE_PRICES</code> in Netlify:
              </p>
              <pre className="adm-pre">{result.env}</pre>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy("prices", result.env)}>
                {copied === "prices" ? "Copied" : "Copy STRIPE_PRICES"}
              </button>
            </div>
          )}
        </li>
        <li>
          <b>{tick(Boolean(status.secretKey))} Secret key.</b> Stripe's secret key goes in Netlify as <code>STRIPE_SECRET_KEY</code> (secret).
          {status.secretKey && ` Set (${status.secretKey}).`}
        </li>
        <li>
          <b>{tick(status.webhookSecret)} Webhook.</b> In Stripe, Developers → Webhooks → Add endpoint <code>{status.webhookUrl}</code>{" "}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => copy("url", status.webhookUrl)}>
            {copied === "url" ? "Copied" : "Copy"}
          </button>{" "}
          with these events: <code>{EVENTS.join(", ")}</code>. Put its signing secret in Netlify as <code>STRIPE_WEBHOOK_SECRET</code> (secret).
        </li>
        <li>
          <b>{tick(allPrices)} Prices mapped.</b> {status.prices.map((p) => `${p.set ? "✓" : "○"} ${p.key}`).join(" · ")}
        </li>
        <li>
          <b>{tick(!status.selfServe)} Close the beta switcher.</b> Add <code>PLAN_SELF_SERVE</code> = <code>false</code> once a test checkout works, then delete{" "}
          <code>STRIPE_ADMIN_KEY</code>. Netlify only hands new values to the app on the next deploy.
        </li>
      </ol>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
        Check again
      </button>
      {error && <p className="adm-note adm-bad">{error}</p>}
    </div>
  );
}
