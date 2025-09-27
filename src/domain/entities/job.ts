import type { Effect, Option } from "effect";

import type {
  RemotePolicy,
  Seniority,
  EmploymentType,
  JobRunStatus,
  EntityId,
  Timestamps,
  BaseError,
} from "@/domain/types/common.js";

export interface Job extends Timestamps {
  readonly id: JobId;
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly remotePolicy: RemotePolicy;
  readonly seniority: Seniority;
  readonly employmentType: EmploymentType;
  readonly postedAt: Date;
  readonly salaryHint?: string;
  readonly languages: readonly string[];
  readonly techStack: readonly string[];
  readonly description: string;
  readonly applyUrl: string;
  readonly source: string;
  readonly score?: number;
  readonly rationale?: string;
  readonly gaps?: readonly string[];
}

export type JobId = EntityId;

export interface JobCriteria {
  readonly id: string;
  readonly keywords: readonly string[];
  readonly location: string;
  readonly remotePolicy?: RemotePolicy;
  readonly seniority?: Seniority;
  readonly employmentType?: EmploymentType;
  readonly salaryMin?: number;
  readonly languages?: readonly string[];
  readonly techStack?: readonly string[];
  readonly enabled: boolean;
}

export interface AuthSession extends Timestamps {
  readonly id: string;
  readonly cookies: readonly string[];
  readonly userAgent: string;
  readonly expiresAt: Date;
}

export interface JobRun {
  readonly id: string;
  readonly criteriaId: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly jobsFound: number;
  readonly jobsProcessed: number;
  readonly jobsScored: number;
  readonly errors: readonly string[];
  readonly status: JobRunStatus;
}

export interface JobScore extends Timestamps {
  readonly jobId: string;
  readonly score: number;
  readonly rationale: string;
  readonly gaps: readonly string[];
  readonly cvVersion: string;
  readonly scoredAt: Date;
}

export type JobError = BaseError<"JobError"> & {
  readonly type:
    | "INVALID_JOB_DATA"
    | "SCRAPING_FAILED"
    | "PROCESSING_FAILED"
    | "SCORING_FAILED"
    | "STORAGE_FAILED";
};

export type JobResult = Effect.Effect<Job, JobError>;
export type JobOption = Option.Option<Job>;
