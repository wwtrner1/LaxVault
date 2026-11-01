# Griddy practice builder: scope (not built)

Wes, 2026-11-01: "A Griddy that builds practices, once LaxVault has paying coaches."

**Status: on hold.** On 2026-11-01 the live Stripe account (Lax-Vault) had 0 subscriptions and 0 charges, so the condition isn't met. Build it once there are paying coaches; the trigger below says how many.

## When to build

- Start when LaxVault has **25 paying coaches** (live subscriptions plus unexpired Season Passes). Below that the AI bill is paid by too few people, and Tonight's practice already covers the "make me a plan" job for free.
- Check: Owner console → Billing, or Stripe subscription search `status:"active"`.

## What it does

A coach types what they need in plain words, and Griddy writes a practice script they can edit, print and run live:

> "75 minutes, U12 boys, 18 kids, 2 goalies, we lost on ground balls Saturday, game Thursday."

Griddy answers with a script (periods, minutes, notes) built **only from drills the coach can use**: their own library first, then the 33 starter drills. It never invents a drill the app can't show a diagram for. The coach sees it on Practice like any other script (Replace / Keep mine), and every drill it picks lands in their library the way Start from a plan does today (`applyPlan`).

Follow-ups in the same box: "make it 60 minutes", "more shooting", "swap the 3v2 for something with fewer kids".

## How it's built (small, cheap)

- **Server only.** `POST /api/griddy/practice` in a new `netlify/ai/practice.ts`. The browser never holds a key.
- **One call per request** to the Claude API with tool use: the model gets the coach's request, their age group and roster size, and a compact list of drill ids, names, categories, minutes, player counts and levels (no diagrams). It must answer by calling one tool, `build_script({ name, periods: [{ title, minutes, note, drillIds }] })`. The server rejects unknown drill ids, then runs the result through `fitPlan` (lib/starters/tonight.ts) so the minutes add up exactly.
- **Model:** the smallest current Claude model that handles tool use well (Haiku class). Expected cost about $0.002 to $0.005 a script.
- **Caps:** `dailyUsage` kind `griddy` (the table and `spend()` already exist): Coach 10 scripts a day, Staff and League 25, owner uncapped but counted. Refund the count when the call fails (`refund()`).
- **Gate:** `gateGriddy(tier)` in `lib/plan.ts`. **Coach and up.** Sideline sees the box with one free try a month to show what it does, then the upgrade wall (`askUpgrade`). The trial gets 3 a day.
- **Analytics:** reuse `plan_built` with a `source: "griddy"` property; no new event.
- **Copy:** no "AI" in the button. "Ask Griddy for a practice". Griddy's mascot art (`public/brand/griddy.webp`) is a football leftover and needs a lacrosse version first.

## Out of scope for the first version

Drawing new diagrams, writing new drills, season plans across weeks, voice input, and anything that sends data about players (names, ages) to the model. Rosters stay counts only.

## Work list when it's time

1. `netlify/ai/practice.ts` + route, `ANTHROPIC_API_KEY` in Netlify (never in the repo), caps and refund.
2. `gateGriddy` in `plan.ts`, server check on the route.
3. Practice → "Ask Griddy" box (and on Tonight's practice), result as a script preview with Replace / Keep mine.
4. Guide entry and the tour.
5. CSP: nothing new (the call is server side).
6. Owner console: Griddy usage per day from `daily_usage`.
