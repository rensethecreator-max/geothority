import { expect, test } from "@playwright/test";
import {
  cleanupUser,
  createFreshUser,
  markOnboardingComplete,
  seedScan,
} from "./helpers/supabase-admin.mjs";

test.describe("new user journey", () => {
  test("fresh user can bootstrap through onboarding, scan, and action center", async ({ page }) => {
    const fixture = await createFreshUser();
    let seededScan = null;

    try {
      await page.goto("/signup");
      await expect(page).toHaveURL(/\/login\?mode=signup/);

      await page.goto("/login?mode=signin");
      await page.getByPlaceholder("your@email.com").fill(fixture.email);
      await page.getByPlaceholder("Password").fill(fixture.password);
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page).toHaveURL(/\/onboarding/);
      await expect(page.getByRole("dialog", { name: "Welcome to Geothority" })).toBeVisible();
      await page.getByRole("dialog", { name: "Welcome to Geothority" }).getByRole("button", { name: "Start Setup" }).click();
      await page.getByPlaceholder("Smith Insurance Agency").fill("Acme Insurance Agency");
      await page.getByPlaceholder("Austin").fill("Austin");
      await page.getByPlaceholder("TX").fill("TX");
      await page.getByPlaceholder("https://www.example.com").fill("https://www.acme-insurance.example");
      const businessProfileResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/business-profile") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Save & Continue" }).click();
      await businessProfileResponsePromise;
      await expect(page.getByRole("dialog", { name: "Run Your First Audit" })).toBeVisible();

      await page.route("**/api/scan", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ scan: seededScan }),
        });
      });

      await markOnboardingComplete(fixture.admin, fixture.userId);
      await page.getByRole("button", { name: /Run First Audit/i }).click();

      await expect(page).toHaveURL(/\/scan\?/);
      await expect(page.getByPlaceholder("https://yourinsuranceagency.com")).toHaveValue("https://www.acme-insurance.example");
      await expect(page.getByPlaceholder("Smith Insurance Agency")).toHaveValue("Acme Insurance Agency");
      seededScan = await seedScan(fixture.admin, fixture.userId, {
        url: "https://www.acme-insurance.example",
        business_name: "Acme Insurance Agency",
        city: "Austin",
        state: "TX",
      });
      await page.getByRole("button", { name: "Scan Website" }).click();

      await expect(page).toHaveURL(new RegExp(`/scan/${seededScan.id}`));
      await expect(page.getByText("Trust Stack Score")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Connect GBP" })).toBeVisible();
    } finally {
      await cleanupUser(fixture.admin, fixture.userId);
    }
  });
});
