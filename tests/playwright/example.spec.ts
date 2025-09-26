import { test, expect } from "@playwright/test";

test("should take a screenshot of example.com", async ({ page }) => {
  await page.goto("https://example.com");

  // Check that the page loaded correctly
  await expect(page).toHaveTitle(/Example Domain/);

  // Take a screenshot
  await page.screenshot({ path: "tests/playwright/example-screenshot.png" });

  // Verify the main heading is visible
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Example Domain");
});
