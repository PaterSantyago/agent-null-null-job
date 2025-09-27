import { Effect } from "effect";
/* global navigator window document */
import { chromium } from "playwright";

import type { Job, JobCriteria, AuthSession } from "@/domain/entities/job.js";
import type { LinkedInScraper, ScrapingError } from "@/domain/ports/linkedin-scraper.js";

export const createLinkedInScraper = (): LinkedInScraper => {
  // const browserInstances = new Map<string, { readonly browser: any; readonly context: any }>();

  return {
    checkAuth: (): Effect.Effect<boolean, ScrapingError> => {
      return Effect.tryPromise({
        try: async () => {
          const browser = await chromium.launch({ headless: false });
          const context = await browser.newContext();
          const page = await context.newPage();

          await page.goto("https://www.linkedin.com/feed/");

          // Check if we're logged in by looking for the feed content
          const isLoggedIn = await page
            .locator('[data-test-id="main-feed"]')
            .isVisible()
            .catch(() => false);

          await browser.close();
          return isLoggedIn;
        },
        catch: (error) =>
          ({
            _tag: "ScrapingError",
            type: "NETWORK_ERROR",
            message: `Failed to check auth: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as ScrapingError,
      });
    },

    login: (): Effect.Effect<AuthSession, ScrapingError> => {
      return Effect.tryPromise({
        try: async () => {
          const browser = await chromium.launch({
            headless: false,
            slowMo: 100,
          });
          const context = await browser.newContext();
          const page = await context.newPage();

          await page.goto("https://www.linkedin.com/login");

          // Wait for user to complete login manually
          await page.waitForURL("https://www.linkedin.com/feed/", { timeout: 300000 }); // 5 minutes

          // Get cookies
          const cookies = await context.cookies();
          const cookieStrings = cookies.map((cookie) => `${cookie.name}=${cookie.value}`);

          const session: AuthSession = {
            id: `session-${Date.now()}`,
            cookies: cookieStrings,
            userAgent: await page.evaluate(() => navigator.userAgent),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await browser.close();
          return session;
        },
        catch: (error) =>
          ({
            _tag: "ScrapingError",
            type: "AUTH_REQUIRED",
            message: `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as ScrapingError,
      });
    },

    isLoggedIn: (session: AuthSession): Effect.Effect<boolean, ScrapingError> => {
      return Effect.tryPromise({
        try: async () => {
          const browser = await chromium.launch({ headless: true });
          const context = await browser.newContext();

          // Set cookies
          const cookies = session.cookies.map((cookieString) => {
            const [name, value] = cookieString.split("=");
            return {
              name: name ?? "",
              value: value ?? "",
              domain: ".linkedin.com",
              path: "/",
            };
          });
          await context.addCookies(cookies);

          const page = await context.newPage();
          await page.goto("https://www.linkedin.com/feed/");

          const isLoggedIn = await page
            .locator('[data-test-id="main-feed"]')
            .isVisible()
            .catch(() => false);

          await browser.close();
          return isLoggedIn;
        },
        catch: (error) =>
          ({
            _tag: "ScrapingError",
            type: "NETWORK_ERROR",
            message: `Failed to check login status: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as ScrapingError,
      });
    },

    scrapeJobs: (
      criteria: JobCriteria,
      session: AuthSession,
    ): Effect.Effect<readonly Job[], ScrapingError> => {
      return Effect.tryPromise({
        try: async () => {
          const browser = await chromium.launch({
            headless: process.env["NODE_ENV"] === "test" || process.env["CI"] === "true",
            slowMo: process.env["NODE_ENV"] === "test" ? 0 : 100,
          });
          const context = await browser.newContext();

          // Set cookies
          const cookies = session.cookies.map((cookieString) => {
            const [name, value] = cookieString.split("=");
            return {
              name: name ?? "",
              value: value ?? "",
              domain: ".linkedin.com",
              path: "/",
            };
          });
          await context.addCookies(cookies);

          const page = await context.newPage();

          // Build search URL
          const searchParams = new URLSearchParams({
            keywords: criteria.keywords.join(" "),
            location: criteria.location,
            f_TPR: "r3600", // Last hour
          });

          const searchUrl = `https://www.linkedin.com/jobs/search/?${searchParams.toString()}`;
          await page.goto(searchUrl);

          // Wait for job listings to load
          await page.waitForSelector('[data-test-id="job-card"]', { timeout: 10000 });

          // Scroll to load more jobs (conservative approach)
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(2000);

          // Extract job data
          const jobs = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('[data-test-id="job-card"]');
            const jobs: any[] = [];

            jobElements.forEach((element, index) => {
              try {
                const titleElement = element.querySelector('[data-test-id="job-title"]');
                const companyElement = element.querySelector('[data-test-id="job-company"]');
                const locationElement = element.querySelector('[data-test-id="job-location"]');
                const linkElement = element.querySelector('a[href*="/jobs/view/"]');

                if (titleElement && companyElement && locationElement && linkElement) {
                  const title = titleElement.textContent?.trim() || "";
                  const company = companyElement.textContent?.trim() || "";
                  const location = locationElement.textContent?.trim() || "";
                  const applyUrl = (linkElement as HTMLAnchorElement).href;

                  // Check if job was posted within the last hour
                  const timeElement = element.querySelector("time");
                  const timeText = timeElement?.textContent?.trim() ?? "";

                  if (timeText.includes("hour") || timeText.includes("minute")) {
                    jobs.push({
                      id: { value: `job-${Date.now()}-${index}` },
                      title,
                      company,
                      location,
                      remotePolicy: "UNKNOWN",
                      seniority: "UNKNOWN",
                      employmentType: "FULL_TIME",
                      postedAt: new Date(),
                      salaryHint: "",
                      languages: [],
                      techStack: [],
                      description: `${title} at ${company} in ${location}`,
                      applyUrl,
                      source: "linkedin",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    });
                  }
                }
              } catch (error) {
                console.warn("Failed to extract job data:", error);
              }
            });

            return jobs as readonly Job[];
          });

          await browser.close();

          return jobs.map((job) => ({
            id: { value: job.id.value },
            title: job.title,
            company: job.company,
            location: job.location,
            remotePolicy: job.remotePolicy,
            seniority: job.seniority,
            employmentType: job.employmentType,
            postedAt: new Date(job.postedAt),
            description: job.description,
            applyUrl: job.applyUrl,
            source: job.source,
            languages: [],
            techStack: [],
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
          }));
        },
        catch: (error) =>
          ({
            _tag: "ScrapingError",
            type: "NETWORK_ERROR",
            message: `Failed to scrape jobs: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as ScrapingError,
      });
    },
  };
};
