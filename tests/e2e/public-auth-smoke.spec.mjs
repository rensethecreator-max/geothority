import { expect, test } from "@playwright/test";

test("public entry and sign-in page render", async ({ page }) => {
  const home = await page.goto("/");
  expect(home?.ok()).toBeTruthy();
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);

  const login = await page.goto("/login");
  expect(login?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByPlaceholder("your@email.com")).toBeVisible();
  await expect(page.getByPlaceholder("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
});

test("every protected app route redirects anonymous visitors to sign-in", async ({ page }) => {
  for (const route of ["/dashboard", "/action-center", "/ai-visibility", "/reputation", "/trust-score"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(route)}`));
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  }
});
