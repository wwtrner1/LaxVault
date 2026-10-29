/**
 * Coach-to-coach invites. A link with ?ref=<inviter's account id> is kept in
 * this browser; the first paid plan sends it to Checkout, where the new coach
 * gets the first month free and the inviter a month of credit once they pay
 * (netlify/billing/stripe.ts). The server ignores a self-invite.
 */
const KEY = "laxvault.ref.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keep an invite from the address bar, once per visit. */
export function captureReferral(search: string) {
  const ref = new URLSearchParams(search).get("ref");
  if (!ref || !UUID.test(ref)) return;
  try {
    localStorage.setItem(KEY, ref);
  } catch {
    /* storage blocked: no invite credit, nothing else changes */
  }
}

export function referral(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export const inviteLink = (accountId: string) => `https://app.lax-vault.com/?ref=${encodeURIComponent(accountId)}`;
