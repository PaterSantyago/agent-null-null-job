import { Effect } from "effect";
import { chromium } from "playwright";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  type BrowserDriver,
  type BrowserInstance,
  type Page,
  BrowserError,
} from "@/domain/ports/browser-driver.js";

export const createPlaywrightBrowserDriver = (): BrowserDriver => {
  const browserInstances = new Map<string, { readonly browser: any; readonly context: any }>();

  return {
    launch: (): Effect.Effect<BrowserInstance, BrowserError> => {
      return Effect.tryPromise({
        try: async () => {
          const browser = await chromium.launch({
            headless: process.env.NODE_ENV === "test" || process.env.CI === "true", // Headless in test/CI environments
            slowMo: process.env.NODE_ENV === "test" ? 0 : 100, // No delay in test environments
          });

          const context = await browser.newContext();
          const playwrightPage = await context.newPage();

          const page: Page = {
            goto: (url: string) =>
              Effect.tryPromise({
                try: () => playwrightPage.goto(url),
                catch: (error) => {
                  const err = error as Error;
                  return {
                    _tag: "BrowserError",
                    type: "PAGE_NAVIGATION_FAILED",
                    message: `Failed to navigate to ${url}: ${err.message}`,
                    cause: err,
                  } as BrowserError;
                },
              }),

            click: (selector: string) =>
              Effect.tryPromise({
                try: () => playwrightPage.click(selector),
                catch: (error) => {
                  const err = error as Error;
                  return {
                    _tag: "BrowserError",
                    type: "ELEMENT_NOT_FOUND",
                    message: `Failed to click element ${selector}: ${err.message}`,
                    cause: err,
                  } as BrowserError;
                },
              }),

            type: (selector: string, text: string) =>
              Effect.tryPromise({
                try: () => playwrightPage.fill(selector, text),
                catch: (error) => {
                  const err = error as Error;
                  return {
                    _tag: "BrowserError",
                    type: "ELEMENT_NOT_FOUND",
                    message: `Failed to type in element ${selector}: ${err.message}`,
                    cause: err,
                  } as BrowserError;
                },
              }),

            screenshot: (path: string) =>
              Effect.tryPromise({
                try: () => playwrightPage.screenshot({ path }),
                catch: (error) => {
                  const err = error as Error;
                  return {
                    _tag: "BrowserError",
                    type: "SCREENSHOT_FAILED",
                    message: `Failed to take screenshot at ${path}: ${err.message}`,
                    cause: err,
                  } as BrowserError;
                },
              }),

            close: () =>
              Effect.tryPromise({
                try: () => playwrightPage.close(),
                catch: (error) => {
                  const err = error as Error;
                  return {
                    _tag: "BrowserError",
                    type: "BROWSER_LAUNCH_FAILED",
                    message: `Failed to close page: ${err.message}`,
                    cause: err,
                  } as BrowserError;
                },
              }),
          };

          const instanceId = `browser-${Date.now()}`;
          browserInstances.set(instanceId, { browser, context });

          return {
            id: instanceId,
            page,
          };
        },
        catch: (error) => {
          const err = error as Error;
          return {
            _tag: "BrowserError",
            type: "BROWSER_LAUNCH_FAILED",
            message: `Failed to launch browser: ${err.message}`,
            cause: err,
          } as BrowserError;
        },
      });
    },

    close: (instance: BrowserInstance): Effect.Effect<void, BrowserError> => {
      return Effect.tryPromise({
        try: async () => {
          const browserInstance = browserInstances.get(instance.id);
          if (browserInstance) {
            await browserInstance.context.close();
            await browserInstance.browser.close();
            browserInstances.delete(instance.id);
          }
        },
        catch: (error) => {
          const err = error as Error;
          return {
            _tag: "BrowserError",
            type: "BROWSER_LAUNCH_FAILED",
            message: `Failed to close browser: ${err.message}`,
            cause: err,
          } as BrowserError;
        },
      });
    },
  };
};
