import type { Job, AuthSession, JobRun, JobScore } from "@/domain/entities/job.js";
import type {
  BaseError,
  EffectResult,
  EffectOption,
  EffectArray,
  EffectVoid,
  EffectBoolean,
} from "@/domain/types/common.js";

export interface StorageService {
  readonly saveJob: (job: Job) => EffectResult<Job, StorageError>;
  readonly getJob: (id: string) => EffectOption<Job, StorageError>;
  readonly getJobsByCriteria: (criteriaId: string, since?: Date) => EffectArray<Job, StorageError>;
  readonly saveSession: (session: AuthSession) => EffectVoid<StorageError>;
  readonly getSession: () => EffectOption<AuthSession, StorageError>;
  readonly deleteSession: () => EffectVoid<StorageError>;
  readonly saveJobRun: (run: JobRun) => EffectVoid<StorageError>;
  readonly getLatestJobRun: (criteriaId: string) => EffectOption<JobRun, StorageError>;
  readonly saveJobScore: (score: JobScore) => EffectVoid<StorageError>;
  readonly getJobScores: (jobId: string) => EffectArray<JobScore, StorageError>;
  readonly markJobAsSeen: (jobId: string) => EffectVoid<StorageError>;
  readonly isJobSeen: (jobId: string) => EffectBoolean<StorageError>;
  readonly getSeenJobIds: () => EffectArray<string, StorageError>;
  readonly clearSeenJobs: () => EffectVoid<StorageError>;
}

export type StorageError = BaseError<"StorageError"> & {
  readonly type:
    | "DATABASE_ERROR"
    | "ENCRYPTION_ERROR"
    | "FILE_SYSTEM_ERROR"
    | "PERMISSION_ERROR"
    | "UNKNOWN";
};
