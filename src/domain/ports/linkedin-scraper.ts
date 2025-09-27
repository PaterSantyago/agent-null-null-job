import type { Job, JobCriteria, AuthSession } from "@/domain/entities/job.js";
import type { BaseError, EffectResult, EffectBoolean, EffectArray } from "@/domain/types/common.js";

export interface LinkedInScraper {
  readonly checkAuth: () => EffectBoolean<ScrapingError>;
  readonly login: () => EffectResult<AuthSession, ScrapingError>;
  readonly scrapeJobs: (
    criteria: JobCriteria,
    session: AuthSession,
  ) => EffectArray<Job, ScrapingError>;
  readonly isLoggedIn: (session: AuthSession) => EffectBoolean<ScrapingError>;
}

export type ScrapingError = BaseError<"ScrapingError"> & {
  readonly type:
    | "AUTH_REQUIRED"
    | "RATE_LIMITED"
    | "CAPTCHA_REQUIRED"
    | "DOM_DRIFT"
    | "NETWORK_ERROR"
    | "TIMEOUT"
    | "UNKNOWN";
};
