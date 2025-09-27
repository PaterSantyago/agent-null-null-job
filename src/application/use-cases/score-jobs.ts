import { Effect } from "effect";

import type { Job } from "@/domain/entities/job.js";
import type { LLMService } from "@/domain/ports/llm-service.js";
import type { StorageService } from "@/domain/ports/storage-service.js";
import type { BaseError } from "@/domain/types/common.js";

export interface ScoreJobsRequest {
  readonly jobs: readonly Job[];
  readonly cvContent: string;
  readonly cvVersion: string;
  readonly minScore: number;
  readonly usePrefilter: boolean;
}

export type ScoreJobsError = BaseError<"ScoreJobsError"> & {
  readonly type: "LLM_ERROR" | "STORAGE_ERROR" | "UNKNOWN";
};

export const scoreJobs =
  (llmService: LLMService, storage: StorageService) =>
  (request: ScoreJobsRequest): Effect.Effect<readonly Job[], ScoreJobsError> => {
    return Effect.gen(function* () {
      const scoreJob = (job: Job): Effect.Effect<Job | null, ScoreJobsError> => {
        return Effect.gen(function* () {
          // Check if we already have a recent score for this job
          const existingScores = yield* storage.getJobScores(job.id.value).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "ScoreJobsError" as const,
                  type: "STORAGE_ERROR" as const,
                  message: `Failed to get existing scores: ${error.message}`,
                  cause: error,
                }) as ScoreJobsError,
            ),
          );

          const recentScore = existingScores.find(
            (score) =>
              score.cvVersion === request.cvVersion &&
              Date.now() - score.scoredAt.getTime() < 24 * 60 * 60 * 1000, // 24 hours
          );

          if (recentScore) {
            // Use existing score
            return {
              ...job,
              score: recentScore.score,
              rationale: recentScore.rationale,
              gaps: recentScore.gaps,
            };
          }

          // Prefilter if enabled
          if (request.usePrefilter) {
            const shouldScore = yield* llmService.prefilterJob(job, request.cvContent).pipe(
              Effect.mapError(
                (error) =>
                  ({
                    _tag: "ScoreJobsError" as const,
                    type: "LLM_ERROR" as const,
                    message: `Prefilter failed: ${error.message}`,
                    cause: error,
                  }) as ScoreJobsError,
              ),
              Effect.catchAll(() => Effect.succeed(true)), // Default to true if prefilter fails
            );

            if (!shouldScore) {
              return null;
            }
          }

          // Score the job
          const jobScore = yield* llmService.scoreJob(job, request.cvContent).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "ScoreJobsError" as const,
                  type: "LLM_ERROR" as const,
                  message: `Failed to score job: ${error.message}`,
                  cause: error,
                }) as ScoreJobsError,
            ),
          );

          // Save the score
          yield* storage.saveJobScore(jobScore).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "ScoreJobsError" as const,
                  type: "STORAGE_ERROR" as const,
                  message: `Failed to save job score: ${error.message}`,
                  cause: error,
                }) as ScoreJobsError,
            ),
          );

          // Only include jobs that meet the minimum score
          if (jobScore.score >= request.minScore) {
            return {
              ...job,
              score: jobScore.score,
              rationale: jobScore.rationale,
              gaps: jobScore.gaps,
            };
          }

          return null;
        });
      };

      const results = yield* Effect.forEach(request.jobs, scoreJob);
      return results.filter((job): job is Job => job !== null);
    });
  };
