import { Effect } from "effect";

import { authenticate } from "@/application/use-cases/authenticate.js";
import { processJobs } from "@/application/use-cases/process-jobs.js";
import { scoreJobs } from "@/application/use-cases/score-jobs.js";
import { scrapeJobs } from "@/application/use-cases/scrape-jobs.js";
import { sendNotifications } from "@/application/use-cases/send-notifications.js";
import type { LinkedInJobHunterConfig } from "@/domain/entities/config.js";
import type { Job, JobCriteria, AuthSession, JobRun } from "@/domain/entities/job.js";
import type { LinkedInScraper } from "@/domain/ports/linkedin-scraper.js";
import type { LLMService } from "@/domain/ports/llm-service.js";
import type { StorageService } from "@/domain/ports/storage-service.js";
import type { TelegramService } from "@/domain/ports/telegram-service.js";

export interface NullNullJobService {
  readonly authenticate: (forceReauth?: boolean) => Effect.Effect<AuthSession, any>;
  readonly runJobDiscovery: (criteria: JobCriteria, dryRun?: boolean) => Effect.Effect<JobRun, any>;
  readonly scoreExistingJobs: (criteria: JobCriteria) => Effect.Effect<readonly Job[], any>;
  readonly sendLastResults: (criteria: JobCriteria) => Effect.Effect<void, any>;
  readonly getStatus: () => Effect.Effect<NullNullJobStatus, any>;
  readonly purgeCache: (type: "cache" | "all") => Effect.Effect<void, any>;
}

export interface NullNullJobStatus {
  readonly sessionValid: boolean;
  readonly lastRun: JobRun | undefined;
  readonly totalJobs: number;
  readonly highScoreJobs: number;
  readonly tokenSpend: number;
  readonly errors: readonly string[];
}

export const createNullNullJobService = (
  config: LinkedInJobHunterConfig,
  scraper: LinkedInScraper,
  llmService: LLMService,
  storage: StorageService,
  telegram: TelegramService,
): NullNullJobService => {
  const authenticateUseCase = authenticate(scraper, storage);
  const scrapeJobsUseCase = scrapeJobs(scraper, storage);
  const processJobsUseCase = processJobs(llmService);
  const scoreJobsUseCase = scoreJobs(llmService, storage);
  const sendNotificationsUseCase = sendNotifications(telegram);

  return {
    authenticate: (forceReauth = false) => authenticateUseCase({ forceReauth }),

    runJobDiscovery: (criteria: JobCriteria, dryRun = false) =>
      Effect.gen(function* () {
        const runId = `run-${Date.now()}`;
        const run: JobRun = {
          id: runId,
          criteriaId: criteria.id,
          startedAt: new Date(),
          jobsFound: 0,
          jobsProcessed: 0,
          jobsScored: 0,
          errors: [],
          status: "RUNNING",
        };

        // Save initial run
        yield* storage.saveJobRun(run);

        try {
          // Authenticate
          const session = yield* authenticateUseCase({ forceReauth: false });

          // Scrape jobs
          const scrapedJobs = yield* scrapeJobsUseCase({
            criteria,
            session,
            runId,
            since: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          });

          // Update run with scraped jobs count
          const updatedRun1 = { ...run, jobsFound: scrapedJobs.length };
          yield* storage.saveJobRun(updatedRun1);

          if (dryRun) {
            return { ...updatedRun1, status: "COMPLETED" as const, completedAt: new Date() };
          }

          // Process jobs (extract structured data)
          const rawJobs = scrapedJobs.map((job) => ({
            content: job.description,
            url: job.applyUrl,
            timestamp: job.postedAt,
          }));

          const processedJobs = yield* processJobsUseCase({ rawJobs, retryFailed: true });

          // Update run with processed jobs count
          const updatedRun2 = { ...updatedRun1, jobsProcessed: processedJobs.length };
          yield* storage.saveJobRun(updatedRun2);

          // Score jobs
          const scoredJobs = yield* scoreJobsUseCase({
            jobs: processedJobs,
            cvContent: "", // TODO: Load from config.cvPath
            cvVersion: config.scoring.cvVersion,
            minScore: config.scoring.minScore,
            usePrefilter: true,
          });

          // Update run with scored jobs count
          const updatedRun3 = { ...updatedRun2, jobsScored: scoredJobs.length };
          yield* storage.saveJobRun(updatedRun3);

          // Send notifications
          yield* sendNotificationsUseCase({
            jobs: scoredJobs,
            runId,
            criteria: `${criteria.keywords.join(", ")} in ${criteria.location}`,
            sendAlerts: config.telegram.enabled,
            alertThreshold: 85,
          });

          // Complete run
          const completedRun = {
            ...updatedRun3,
            status: "COMPLETED" as const,
            completedAt: new Date(),
          };
          yield* storage.saveJobRun(completedRun);

          return completedRun;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const failedRun = {
            ...run,
            status: "FAILED" as const,
            completedAt: new Date(),
            errors: [...run.errors, errorMessage],
          };
          yield* storage.saveJobRun(failedRun);
          throw error;
        }
      }),

    scoreExistingJobs: (criteria: JobCriteria) =>
      Effect.gen(function* () {
        const jobs = yield* storage.getJobsByCriteria(criteria.id);
        const scoredJobs = yield* scoreJobsUseCase({
          jobs,
          cvContent: "", // TODO: Load from config.cvPath
          cvVersion: config.scoring.cvVersion,
          minScore: config.scoring.minScore,
          usePrefilter: true,
        });
        return scoredJobs;
      }),

    sendLastResults: (criteria: JobCriteria) =>
      Effect.gen(function* () {
        const jobs = yield* storage.getJobsByCriteria(criteria.id);
        const highScoreJobs = jobs.filter((job) => (job.score ?? 0) >= 70);
        yield* sendNotificationsUseCase({
          jobs: highScoreJobs,
          runId: `replay-${Date.now()}`,
          criteria: `${criteria.keywords.join(", ")} in ${criteria.location}`,
          sendAlerts: false,
          alertThreshold: 85,
        });
      }),

    getStatus: () =>
      Effect.gen(function* () {
        const session = yield* storage.getSession();
        const sessionValid = session._tag === "Some" && session.value.expiresAt > new Date();

        // Get latest run for first criteria
        const latestRun = yield* storage.getLatestJobRun(config.criteria[0]?.id ?? "");

        const totalJobs = yield* storage.getJobsByCriteria(config.criteria[0]?.id ?? "");
        const highScoreJobs = totalJobs.filter((job) => (job.score ?? 0) >= 70).length;

        return {
          sessionValid,
          lastRun: latestRun._tag === "Some" ? latestRun.value : undefined,
          totalJobs: totalJobs.length,
          highScoreJobs,
          tokenSpend: 0, // TODO: Track token usage
          errors: [],
        };
      }),

    purgeCache: (type: "cache" | "all") =>
      Effect.gen(function* () {
        if (type === "all") {
          yield* storage.deleteSession();
        }
        yield* storage.clearSeenJobs();
      }),
  };
};
