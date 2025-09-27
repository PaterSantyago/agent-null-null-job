import type { Job } from "@/domain/entities/job.js";
import type { BaseError, EffectVoid } from "@/domain/types/common.js";

export interface TelegramService {
  readonly sendJobDigest: (jobs: readonly Job[], runId: string) => EffectVoid<TelegramError>;
  readonly sendJobAlert: (job: Job, score: number) => EffectVoid<TelegramError>;
  readonly sendStatusUpdate: (message: string) => EffectVoid<TelegramError>;
  readonly sendErrorAlert: (error: string, context?: string) => EffectVoid<TelegramError>;
}

export interface JobDigestMessage {
  readonly runId: string;
  readonly totalJobs: number;
  readonly highScoreJobs: readonly Job[];
  readonly averageScore: number;
  readonly criteria: string;
  readonly timestamp: Date;
}

export type TelegramError = BaseError<"TelegramError"> & {
  readonly type:
    | "API_ERROR"
    | "RATE_LIMITED"
    | "INVALID_TOKEN"
    | "CHAT_NOT_FOUND"
    | "NETWORK_ERROR"
    | "UNKNOWN";
};
