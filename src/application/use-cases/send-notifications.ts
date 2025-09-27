import { Effect } from "effect";

import type { Job } from "@/domain/entities/job.js";
import type { TelegramService } from "@/domain/ports/telegram-service.js";
import type { BaseError } from "@/domain/types/common.js";

export interface SendNotificationsRequest {
  readonly jobs: readonly Job[];
  readonly runId: string;
  readonly criteria: string;
  readonly sendAlerts: boolean;
  readonly alertThreshold: number;
}

export type SendNotificationsError = BaseError<"SendNotificationsError"> & {
  readonly type: "TELEGRAM_ERROR" | "UNKNOWN";
};

export const sendNotifications =
  (telegramService: TelegramService) =>
  (request: SendNotificationsRequest): Effect.Effect<void, SendNotificationsError> => {
    return Effect.gen(function* () {
      if (request.jobs.length === 0) {
        return;
      }

      // Calculate average score for logging
      // const totalScore = request.jobs.reduce((sum, job) => sum + (job.score ?? 0), 0);
      // const averageScore = totalScore / request.jobs.length;

      // Send digest
      yield* telegramService.sendJobDigest(request.jobs, request.runId).pipe(
        Effect.mapError(
          (error) =>
            ({
              _tag: "SendNotificationsError" as const,
              type: "TELEGRAM_ERROR" as const,
              message: `Failed to send digest: ${error.message}`,
              cause: error,
            }) as SendNotificationsError,
        ),
      );

      // Send individual alerts for high-scoring jobs
      if (request.sendAlerts) {
        const highScoreJobs = request.jobs.filter(
          (job) => (job.score ?? 0) >= request.alertThreshold,
        );

        for (const job of highScoreJobs) {
          yield* telegramService.sendJobAlert(job, job.score ?? 0).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "SendNotificationsError" as const,
                  type: "TELEGRAM_ERROR" as const,
                  message: `Failed to send job alert: ${error.message}`,
                  cause: error,
                }) as SendNotificationsError,
            ),
            Effect.catchAll(() => Effect.succeed(undefined)), // Continue on error
          );
        }
      }
    });
  };
