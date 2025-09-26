import type { Effect } from "effect";

export interface BrowserDriver {
  readonly launch: () => Effect.Effect<BrowserInstance, BrowserError>;
  readonly close: (instance: BrowserInstance) => Effect.Effect<void, BrowserError>;
}

export interface BrowserInstance {
  readonly id: string;
  readonly page: Page;
}

export interface Page {
  readonly goto: (url: string) => Effect.Effect<void, BrowserError>;
  readonly click: (selector: string) => Effect.Effect<void, BrowserError>;
  readonly type: (selector: string, text: string) => Effect.Effect<void, BrowserError>;
  readonly screenshot: (path: string) => Effect.Effect<void, BrowserError>;
  readonly close: () => Effect.Effect<void, BrowserError>;
}

export type BrowserError = {
  readonly _tag: "BrowserError";
  readonly type:
    | "BROWSER_LAUNCH_FAILED"
    | "PAGE_NAVIGATION_FAILED"
    | "ELEMENT_NOT_FOUND"
    | "SCREENSHOT_FAILED";
  readonly message: string;
  readonly cause?: Error;
};
