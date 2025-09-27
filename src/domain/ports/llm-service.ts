import type { Job, JobScore } from "@/domain/entities/job.js";
import type { BaseError, EffectResult, EffectBoolean } from "@/domain/types/common.js";

export interface LLMService {
  readonly extractJobData: (rawContent: string) => EffectResult<Job, LLMError>;
  readonly scoreJob: (job: Job, cvContent: string) => EffectResult<JobScore, LLMError>;
  readonly prefilterJob: (job: Job, cvContent: string) => EffectBoolean<LLMError>;
}

export interface JobExtractionRequest {
  readonly rawContent: string;
  readonly url: string;
}

export interface JobScoringRequest {
  readonly job: Job;
  readonly cvContent: string;
  readonly cvVersion: string;
}

export type LLMError = BaseError<"LLMError"> & {
  readonly type:
    | "API_ERROR"
    | "RATE_LIMITED"
    | "INVALID_RESPONSE"
    | "SCHEMA_VALIDATION_FAILED"
    | "TOKEN_LIMIT_EXCEEDED"
    | "UNKNOWN";
};
