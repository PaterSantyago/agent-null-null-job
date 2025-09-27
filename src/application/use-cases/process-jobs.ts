import { Effect } from "effect";

import type { Job } from "@/domain/entities/job.js";
import type { LLMService } from "@/domain/ports/llm-service.js";
import type { BaseError } from "@/domain/types/common.js";

export interface ProcessJobsRequest {
  readonly rawJobs: readonly RawJobData[];
  readonly retryFailed?: boolean;
}

export interface RawJobData {
  readonly content: string;
  readonly url: string;
  readonly timestamp: Date;
}

export type ProcessJobsError = BaseError<"ProcessJobsError"> & {
  readonly type: "LLM_ERROR" | "SCHEMA_VALIDATION_FAILED" | "UNKNOWN";
};

export const processJobs =
  (llmService: LLMService) =>
  (request: ProcessJobsRequest): Effect.Effect<readonly Job[], ProcessJobsError> => {
    return Effect.gen(function* () {
      const results = yield* Effect.forEach(request.rawJobs, (rawJob) =>
        llmService.extractJobData(rawJob.content).pipe(
          Effect.mapError(
            (error) =>
              ({
                _tag: "ProcessJobsError" as const,
                type: "LLM_ERROR" as const,
                message: `Failed to process job: ${error.message}`,
                cause: error,
              }) as ProcessJobsError,
          ),
          Effect.retry({ times: request.retryFailed ? 1 : 0 }),
          Effect.catchAll((_error) => {
            // console.warn(`Failed to process job at ${rawJob.url}: ${_error.message}`);
            return Effect.succeed(null);
          }),
        ),
      );

      const processedJobs = results.filter((job): job is Job => job !== null);

      return processedJobs;
    });
  };
