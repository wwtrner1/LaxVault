import { expect, test } from "@playwright/test";

/** Every screen a new coach can reach before signing in, plus the main tools. */
const PAGES: [string, RegExp][] = [
  ["/", /LaxVault/],
  ["/signin", /Sign in/],
  ["/pricing", /Plans/],
  ["/terms", /Terms/],
  ["/privacy", /Privacy/],
  ["/help", /Help/],
  ["/tonight", /Tonight/],
  ["/drills", /Drills/],
  ["/practice", /Practice/],
  ["/practice/live", /Live practice/],
  ["/vault", /Vault/],
  ["/playbooks", /Playbooks/],
  ["/build", /Designer/],
  ["/guide", /guide/i],
  ["/account", /account/i],
  ["/league", /League/],
  ["/tools", /tools/i],
  ["/not-a-page", /LaxVault/],
];

for (const [path, title] of PAGES) {
  test(`${path} opens with no script errors and no sideways scroll`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator("h1").first()).toBeVisible();
    const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    expect(scroll, "page scrolls sideways").toBeLessThanOrEqual(width + 1);
    expect(errors).toEqual([]);
  });
}

test("legal pages name the company and the guarantee", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByText("Vaultline Sports LLC").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /14-day money-back guarantee/i })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByText("Vaultline Sports LLC").first()).toBeVisible();
});

test("Help & feedback sends a refund request to the API, with an email", async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/feedback", (r) => {
    sent = r.request().postDataJSON();
    return r.fulfill({ status: 204 });
  });
  await page.goto("/help");
  await page.locator("textarea").fill("Please refund my first payment.");
  await page.locator("select").selectOption("Billing or a refund");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("alert")).toContainText("Add your email");
  expect(sent).toBeNull();
  await page.locator('input[type="email"]').fill("coach@example.org");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText("Thanks, coach.")).toBeVisible();
  expect(sent).toMatchObject({ note: "Please refund my first payment.", area: "Billing or a refund", email: "coach@example.org" });
});

test("a failed send keeps the note", async ({ page }) => {
  await page.route("**/api/feedback", (r) => r.fulfill({ status: 500, body: "{}" }));
  await page.goto("/help");
  await page.locator("textarea").fill("The live clock should beep at one minute left.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText("That didn’t send")).toBeVisible();
  await expect(page.locator("textarea")).toHaveValue("The live clock should beep at one minute left.");
});

test("Pricing shows the founding count from the API", async ({ page }) => {
  await page.route("**/api/billing/founding", (r) => r.fulfill({ json: { cap: 250, left: 231, open: true } }));
  await page.goto("/pricing");
  await expect(page.getByText(/231 of 250/).first()).toBeVisible();
});
