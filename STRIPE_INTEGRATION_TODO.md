# Stripe integration: what's left

Checkout Studio settings applied on 2026-11-17 to LaxVault's one existing Checkout Session call (Scenario A: an existing call was found, so nothing new was added).

## Values to Replace

None. The one call already uses real values for every `sample_only` parameter:

**Files containing placeholders:** none.

| Field | Current value | Status |
|-------|---------------|--------|
| mode | `"payment"` for the Season Pass, `"subscription"` for every other offer | Real, kept |
| success_url | `https://app.lax-vault.com/account?billing=success` (`SITE` in [netlify/billing/stripe.ts](netlify/billing/stripe.ts)) | Real, kept |
| cancel_url | `https://app.lax-vault.com/pricing` | Real, kept |
| line_items[].price | The live price id for the offer, from `STRIPE_PRICES` or the ids Run Stripe setup stored (`laxvault_<offer>` lookup keys) | Real, kept |

## Configured Parameters

These come from Checkout Studio and are set exactly as configured.

**Files containing these parameters:**
- [netlify/billing/stripe.ts](netlify/billing/stripe.ts) (`startCheckout`)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted_page` (the installed `stripe` SDK is 23.0.1, so the new name; below 21.0.0 it would be `hosted`) |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: true }` |
| automatic_tax | `{ enabled: true }` |
| allow_promotion_codes | `false` (was `true`) |
| payment_method_collection | `always`, subscriptions only (never sent on the one-time Season Pass) |
| submit_type | `auto` |
| name_collection | `{ individual: { enabled: true, optional: true } }` |
| saved_payment_method_options | `{ payment_method_save: "enabled" }` |
| origin_context | `web` |

### Kept on purpose, although Checkout Studio doesn't list them

The instructions say to drop parameters that aren't in the Field Intents. These stay, because removing any of them would take a coach's money without giving them their plan:

| Parameter | Why it stays |
|-----------|--------------|
| `metadata` (`app: "laxvault"`, `userId`, `offer`, `ref`) | The webhook only acts on checkouts stamped `app: "laxvault"` (`ours()`), and reads `userId`/`offer` to set the plan. |
| `subscription_data.metadata`, `subscription_data.trial_period_days` | Same stamp on the subscription; the founding counter and referral credit read it; the referral's 30-day first month. |
| `client_reference_id` | Ties the session to the coach's account id. |
| `customer` / `customer_email` | Reuses a returning coach's Stripe customer, so the portal and receipts stay on one record. |
| `customer_creation: "always"` (Season Pass only) | A one-time payment makes no customer otherwise; the portal, refunds and `payment_method_save` all need one. |

### Added because a configured setting needs it

| Parameter | Why |
|-----------|-----|
| `customer_update: { address: "auto", name: "auto" }` (only when an existing `customer` is passed) | `automatic_tax` refuses a returning customer who has no saved address. This lets Checkout save the address (and optional name) the coach types onto their Stripe customer. |

## Setup and next steps

### Already in place
- Keys: `STRIPE_SECRET_KEY` on the Netlify site `lax-vault` (server only, never `VITE_`-prefixed; the browser never talks to Stripe directly, it is sent to the Checkout URL). Prices and the webhook secret are made and stored by Owner console → Billing → Run Stripe setup.
- Stripe Tax is **active** on the live account with a head office in Clarksville, TN, and the default tax behavior is "inferred by currency", so the current prices (tax behavior unspecified) work with `automatic_tax`.

### To do in the Stripe Dashboard
1. **Add tax registrations** (Dashboard → Tax → Registrations) for every state where Vaultline Sports LLC must collect sales tax (Tennessee at least, if software subscriptions are taxable there for you). With no registration, Checkout shows $0 tax: it works, it just collects nothing. Ask your accountant which states apply.
2. Decide whether prices are tax-exclusive (tax added on top of $5, $39, …) or tax-inclusive. The account default treats USD prices as exclusive.

### How it works
1. A coach presses a plan on Pricing or Account; the browser posts `POST /api/billing/checkout {offer}`.
2. `startCheckout` checks the plan rules, then creates the Checkout Session above and returns its `url`; the browser goes there (Stripe-hosted page).
3. Stripe collects card, billing address, phone, optional name and tax, then returns the coach to `/account?billing=success` (or `/pricing` on cancel).
4. The webhook (`POST /api/billing/webhook`) sets the plan from the stamped session and subscription. The phone, address and name stay in Stripe; LaxVault doesn't copy them (the Privacy page says so).

### Testing
- Use a test-mode key (`sk_test_…`) on a deploy preview or `netlify dev`, run Run Stripe setup, then pay with `4242 4242 4242 4242`, any future date, any CVC. `4000 0025 0000 3155` tests 3-D Secure; `4000 0000 0000 9995` a decline.
- Live check without paying: open Pricing while signed in and press a plan. The Stripe page should open showing address, phone and an optional name field. Close it; nothing is charged.

### Notes
- No promotion codes field now. Referrals still work: they use a 30-day trial and a $5 account credit, not codes.
- Resources: https://support.stripe.com and https://docs.stripe.com/mcp
