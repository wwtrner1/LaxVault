import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";

/*
 * The owner's Admin link (2026-11-18): the page looked signed in while the account answered every call as
 * "nobody signed in", because the page and Identity both refreshed the sign-in with one refresh token. The side
 * menu took that as "not the owner" and Admin disappeared. The first test fails on the old code; the second guards
 * the single refresher.
 */

const USER = { id: "u1", email: "coach@example.com", confirmed_at: "2026-01-01", app_metadata: { provider: "email" }, user_metadata: { full_name: "Coach" } };
const OWNER = { user: { id: "u1", email: "coach@example.com", name: "Coach" }, owner: true, plan: "master" };
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (n: number, secondsLeft: number) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", email: "coach@example.com", n, exp: Math.floor(Date.now() / 1000) + secondsLeft })}.sig`;
const adminLink = (page: Page) => page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: /Admin/ });

/** A saved Identity sign-in with `secondsLeft` on its token (seeded once per tab, so a reload keeps what the page wrote). */
async function savedSignIn(context: BrowserContext, secondsLeft: number) {
  await context.addInitScript(
    ([token, left]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(
        "gotrue.user",
        JSON.stringify({
          id: "u1",
          email: "coach@example.com",
          app_metadata: { provider: "email" },
          user_metadata: { full_name: "Coach" },
          token: { access_token: token, refresh_token: "r0", expires_at: Date.now() + Number(left) * 1000, token_type: "bearer" },
          url: `${location.origin}/.netlify/identity`,
        }),
      );
    },
    [jwt(0, secondsLeft), String(secondsLeft)],
  );
}

/** /api mocked: `me` answers through `onMe`, everything else empty. */
async function mockApi(context: BrowserContext, onMe: (route: Route) => Promise<void>) {
  await context.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\//, "");
    if (path === "me") return onMe(route);
    if (route.request().method() === "GET" && path.startsWith("playbooks")) return route.fulfill({ json: { playbooks: [], members: [] } });
    if (route.request().method() === "GET" && path.startsWith("plays")) return route.fulfill({ json: { plays: [] } });
    if (route.request().method() === "GET" && path === "docs") return route.fulfill({ json: { docs: [] } });
    return route.fulfill({ status: 204, body: "" });
  });
}

/** Identity that hands out a new refresh token on every refresh and retires the old one, the way Netlify's does. */
async function rotatingIdentity(context: BrowserContext) {
  const state = { current: "r0", n: 0, refused: 0 };
  await context.route("**/.netlify/identity/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/settings")) return route.fulfill({ json: { external: {}, disable_signup: false, autoconfirm: false } });
    if (url.endsWith("/token")) {
      const used = new URLSearchParams(route.request().postData() ?? "").get("refresh_token");
      if (used !== state.current) {
        state.refused += 1;
        return route.fulfill({ status: 400, json: { error: "invalid_grant", error_description: "Invalid Refresh Token" } });
      }
      state.n += 1;
      state.current = `r${state.n}`;
      return route.fulfill({ json: { access_token: jwt(state.n, 3600), token_type: "bearer", expires_in: 3600, refresh_token: state.current } });
    }
    return route.fulfill({ json: USER });
  });
  return state;
}

test.beforeEach(({}, info) => test.skip(info.project.name === "phone", "the side menu is a drawer on phones"));

test("the owner keeps the Admin link when the account first answers as if nobody were signed in", async ({ page, context }) => {
  await savedSignIn(context, 86_400);
  await rotatingIdentity(context);
  let asked = 0;
  // The sign-in cookie ran out: the first questions are answered "nobody". The side menu refreshes the sign-in and
  // asks again instead of taking that as "not the owner".
  await mockApi(context, (route) => {
    asked += 1;
    return route.fulfill({ json: asked <= 2 ? { user: null } : OWNER });
  });
  await page.goto("/vault");
  await expect(adminLink(page)).toBeVisible();
  expect(asked).toBeGreaterThanOrEqual(3);
});

test("a sign-in that runs out is refreshed by one refresher only, so it stays signed in", async ({ page, context }) => {
  await savedSignIn(context, 130);
  const identity = await rotatingIdentity(context);
  await mockApi(context, (route) => route.fulfill({ json: OWNER }));
  await page.clock.install();
  await page.goto("/vault");
  await expect(adminLink(page)).toBeVisible();
  // Back from another app with under two minutes left: the page used to trade the refresh token itself right then,
  // while Identity still held the old one for its own refresh in the token's last minute.
  await page.clock.fastForward(20_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.clock.fastForward(60_000);
  await expect.poll(() => identity.n).toBe(1);
  expect(identity.refused).toBe(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gotrue.user") ?? "null")?.token?.refresh_token)).toBe("r1");
});
