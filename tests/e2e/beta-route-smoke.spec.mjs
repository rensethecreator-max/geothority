import { expect, test } from "@playwright/test";
import {
  cleanupUserByEmail,
  cleanupUser,
  createFreshUserPayload,
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
  test("signup form accepts a new beta user", async ({ page }) => {
    const betaCode = process.env.GEOTHORITY_BETA_SIGNUP_CODE;
    test.skip(!betaCode, "GEOTHORITY_BETA_SIGNUP_CODE is required for controlled beta signup smoke.");

    const stamp = createFreshUserPayload();
    const creds = {
      email: `beta-test+${Date.now()}_${Math.random().toString(36).slice(2, 8)}@geothority.io`,
      password: stamp.password,
    };

    try {
      await page.goto("/signup");
      await expect(page).toHaveURL(/\/login\?mode=signup/);
      await page.getByPlaceholder("your@email.com").fill(creds.email);
      await page.getByPlaceholder("Password").fill(creds.password);
      await page.getByPlaceholder("Beta access code").fill(betaCode);
      await page.getByRole("button", { name: /Create Account|Sign Up|Start/i }).click();

      await expect(page).toHaveURL(/\/dashboard|\/onboarding/);

      await expectNoRawFailure(page);
    } finally {
      await cleanupUserByEmail(creds.email);
    }
  });

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

  test("fresh beta account can run a real first scan without a mocked response", async ({ page }) => {
    const fixture = await createFreshUser();

    try {
      await markOnboardingComplete(fixture.admin, fixture.userId);

      await page.goto("/login?mode=signin");
      await page.getByPlaceholder("your@email.com").fill(fixture.email);
      await page.getByPlaceholder("Password").fill(fixture.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/\/dashboard|\/onboarding/);

      const scan = await page.evaluate(async () => {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: "https://example.com",
            businessName: "Acme Insurance Agency",
            city: "Austin",
            state: "TX",
          }),
        });
        const payload = await response.json();
        return { ok: response.ok, status: response.status, payload };
      });

      expect(scan.ok, JSON.stringify(scan.payload)).toBe(true);
      expect(scan.payload.scan?.id).toBeTruthy();

      const response = await page.goto(`/scan/${scan.payload.scan.id}`, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();
      await expect(page.getByText("Trust Stack Score")).toBeVisible();
      await expectNoRawFailure(page);
    } finally {
      await cleanupUser(fixture.admin, fixture.userId);
    }
  });

  test("authenticated beta user can delete their own account with email confirmation", async ({ page }) => {
    const fixture = await createFreshUser();
    let deletedViaApi = false;

    try {
      await page.goto("/login?mode=signin");
      await page.getByPlaceholder("your@email.com").fill(fixture.email);
      await page.getByPlaceholder("Password").fill(fixture.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/\/dashboard|\/onboarding/);

      const deletion = await page.evaluate(async (email) => {
        const response = await fetch("/api/user/account", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmEmail: email }),
        });
        const payload = await response.json();
        return { ok: response.ok, status: response.status, payload };
      }, fixture.email);

      expect(deletion.ok, JSON.stringify(deletion.payload)).toBe(true);
      expect(deletion.payload.ok).toBe(true);
      deletedViaApi = true;
    } finally {
      if (!deletedViaApi) {
        await cleanupUser(fixture.admin, fixture.userId);
      }
    }
  });
});
