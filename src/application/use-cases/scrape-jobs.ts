import { Effect } from "effect";

import type { Job, JobCriteria, AuthSession } from "@/domain/entities/job.js";
import type { LinkedInScraper } from "@/domain/ports/linkedin-scraper.js";
import type { StorageService } from "@/domain/ports/storage-service.js";
import type { BaseError } from "@/domain/types/common.js";

export interface ScrapeJobsRequest {
  readonly criteria: JobCriteria;
  readonly session: AuthSession;
  readonly runId: string;
  readonly since?: Date;
}

export type ScrapeJobsError = BaseError<"ScrapeJobsError"> & {
  readonly type: "SCRAPING_FAILED" | "AUTH_REQUIRED" | "RATE_LIMITED" | "STORAGE_ERROR" | "UNKNOWN";
};

export const scrapeJobs =
  (scraper: LinkedInScraper, storage: StorageService) =>
  (request: ScrapeJobsRequest): Effect.Effect<readonly Job[], ScrapeJobsError> => {
    return Effect.gen(function* () {
      // Check if we have recent jobs for this criteria
      const existingJobs = yield* storage
        .getJobsByCriteria(request.criteria.id, request.since)
        .pipe(
          Effect.mapError(
            (error) =>
              ({
                _tag: "ScrapeJobsError" as const,
                type: "STORAGE_ERROR" as const,
                message: `Failed to get existing jobs: ${error.message}`,
                cause: error,
              }) as ScrapeJobsError,
          ),
        );

      // If we have recent jobs and no since date, return them
      if (existingJobs.length > 0 && !request.since) {
        return existingJobs;
      }

      // Scrape new jobs
      const scrapedJobs = yield* scraper.scrapeJobs(request.criteria, request.session).pipe(
        Effect.mapError(
          (error) =>
            ({
              _tag: "ScrapeJobsError" as const,
              type: "SCRAPING_FAILED" as const,
              message: `Failed to scrape jobs: ${error.message}`,
              cause: error,
            }) as ScrapeJobsError,
        ),
      );

      // Filter out jobs we've already seen
      const seenJobIds = yield* storage.getSeenJobIds().pipe(
        Effect.mapError(
          (error) =>
            ({
              _tag: "ScrapeJobsError" as const,
              type: "STORAGE_ERROR" as const,
              message: `Failed to get seen job IDs: ${error.message}`,
              cause: error,
            }) as ScrapeJobsError,
        ),
      );

      const newJobs = scrapedJobs.filter((job) => !seenJobIds.includes(job.id.value));

      // Save new jobs and mark as seen
      const savedJobs = yield* Effect.forEach(newJobs, (job) =>
        Effect.gen(function* () {
          const savedJob = yield* storage.saveJob(job).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "ScrapeJobsError" as const,
                  type: "STORAGE_ERROR" as const,
                  message: `Failed to save job: ${error.message}`,
                  cause: error,
                }) as ScrapeJobsError,
            ),
          );

          // Mark as seen
          yield* storage.markJobAsSeen(job.id.value).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "ScrapeJobsError" as const,
                  type: "STORAGE_ERROR" as const,
                  message: `Failed to mark job as seen: ${error.message}`,
                  cause: error,
                }) as ScrapeJobsError,
            ),
          );

          return savedJob;
        }),
      );

      return savedJobs;
    });
  };
