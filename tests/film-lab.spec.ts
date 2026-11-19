import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("laxvault.tour.v1", "1"));
});

test("Film Lab stands a scenario up in 3D and plays the read game", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/film-lab?scenario=m-3v2-break");
  await expect(page.getByLabel("Play, drill or scenario")).toHaveValue("scenario:m-3v2-break");
  // three.js loads with the page; the cameras show once it has.
  await expect(page.getByRole("button", { name: "Sideline", exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /^See it from/ })).toHaveCount(6);
  await page.getByRole("button", { name: "Sideline", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sideline", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Make the read" }).click();
  await expect(page.getByRole("heading", { name: /Where does it go\?/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Shoot", exact: true }).click();
  await expect(page.getByText("Right read.")).toBeVisible();
  await expect(page.getByText(/Make the read · 1\/1/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("a starter drill opens in Film Lab from the Drills page", async ({ page }) => {
  await page.goto("/drills");
  const link = page.getByRole("link", { name: /in 3D$/ }).first();
  await expect(link).toHaveAttribute("href", /\/film-lab\?drill=/);
  await link.click();
  await expect(page).toHaveURL(/\/film-lab\?drill=/);
  await expect(page.getByLabel("Play, drill or scenario")).toHaveValue(/^drill:/);
});
