import { expect, test } from "@playwright/test";
import {
  cleanupUser,
  createFreshUser,
  markOnboardingComplete,
  seedScan,
} from "./helpers/supabase-admin.mjs";

const publicRoutes = [
  "/",
  "/pricing",
  "/service-facts",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/compare/geothority-vs-brightlocal",
  "/for/insurance-agents",
];

const appRoutes = [
  "/dashboard",
  "/action-center",
  "/reports",
  "/content",
  "/ai-overview",
  "/ai-visibility",
  "/competitors",
  "/reputation",
  "/gbp-health",
  "/google-business",
  "/billing",
  "/settings",
];

async function expectNoRawFailure(page) {
  const bodyText = await page.locator("body").innerText({ timeout: 15_000 });
  expect(bodyText).not.toMatch(/Application error|Internal Server Error|Unhandled Runtime Error/i);
  expect(bodyText).not.toMatch(/Could not find .* in the schema cache|PGRST205|relation .* does not exist/i);
}

test.describe("first-users beta route smoke", () => {
  test("public launch pages load without broken-page failures", async ({ page }) => {
    for (const route of publicRoutes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
      await expectNoRawFailure(page);
    }
  });

  test("core authenticated beta routes load for a one-company account", async ({ page }) => {
    const fixture = await createFreshUser();

    try {
      await markOnboardingComplete(fixture.admin, fixture.userId);
      const scan = await seedScan(fixture.admin, fixture.userId);

      await page.goto("/login?mode=signin");
      await page.getByPlaceholder("your@email.com").fill(fixture.email);
      await page.getByPlaceholder("Password").fill(fixture.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/\/dashboard|\/onboarding/);

      const routes = [...appRoutes, `/scan/${scan.id}`];

      for (const route of routes) {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
        await expectNoRawFailure(page);
      }
    } finally {
      await cleanupUser(fixture.admin, fixture.userId);
    }
  });
});
