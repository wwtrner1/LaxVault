import { expect, test } from "@playwright/test";

/** The line ring: tap a player in Select and the line kinds fan out; a kind drops its line. */
test("a tap on a player opens the line ring and a kind drops its line", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop layout: the Sets tab sits in the rail.");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Skip the first-visit tour so it can't open over the field mid-test.
  await page.addInitScript(() => localStorage.setItem("laxvault.tour.v1", "1"));
  await page.goto("/build");
  await page.getByRole("tab", { name: "Sets" }).first().click();
  await page.getByRole("button", { name: /2-3-1/ }).first().click();
  const lines = page.locator(".stage-frame svg path[marker-end]");
  const before = await lines.count();

  // The token's grab circle carries a "Drag to move A" title.
  const token = page.locator(".stage-frame svg circle", { has: page.locator("title", { hasText: /^Drag to move A$/ }) }).first();
  const tap = () => token.click();
  await tap();
  const ring = page.getByRole("menu", { name: /Lines for/ });
  const first = ring.getByRole("menuitem").first();
  await expect(first).toBeVisible();
  await expect(ring.getByRole("menuitem")).toHaveCount(6);

  await ring.getByRole("menuitem", { name: /^Pass/ }).click();
  await expect(ring).toHaveCount(0);
  await expect.poll(() => lines.count()).toBeGreaterThan(before);
  await expect(page.getByText(/Line dropped/)).toBeVisible();

  // Escape closes the ring without drawing.
  await tap();
  await expect(first).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ring).toHaveCount(0);
  expect(errors).toEqual([]);
});
