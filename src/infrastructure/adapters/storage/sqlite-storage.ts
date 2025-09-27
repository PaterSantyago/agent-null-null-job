import KeyvSqlite from "@keyv/sqlite";
import CryptoJS from "crypto-js";
import { Effect, Option } from "effect";
import Keyv from "keyv";

import type { Job, AuthSession, JobRun, JobScore } from "@/domain/entities/job.js";
import type { StorageService, StorageError } from "@/domain/ports/storage-service.js";

export const createSqliteStorageService = (
  dataDir: string,
  encryptionKey: string,
): StorageService => {
  const keyv = new Keyv({
    store: new KeyvSqlite(`${dataDir}/jobs.db`),
    namespace: "agent-null-null-job",
  });

  const encrypt = (data: any): string => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
  };

  const decrypt = <T>(encryptedData: string): T => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const jsonString = bytes.toString(CryptoJS.enc.Utf8);

    // Custom deserializer to handle Date objects
    const parsed = JSON.parse(jsonString, (key, value) => {
      // Convert ISO date strings back to Date objects
      if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)
      ) {
        return new Date(value);
      }
      return value;
    });

    return parsed as T;
  };

  return {
    saveJob: (job: Job): Effect.Effect<Job, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const encrypted = encrypt(job);
          await keyv.set(`job:${job.id.value}`, encrypted);
          return job;
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to save job: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    getJob: (id: string): Effect.Effect<Option.Option<Job>, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const encrypted = await keyv.get(`job:${id}`);
          if (!encrypted) {
            return Option.none();
          }
          const job = decrypt<Job>(encrypted);
          return Option.some(job);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to get job: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    getJobsByCriteria: (
      criteriaId: string,
      since?: Date,
    ): Effect.Effect<readonly Job[], StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const jobs: readonly Job[] = [];
          const iterator = keyv.iterator?.({ namespace: "job" });

          if (iterator) {
            for await (const [key, encrypted] of iterator) {
              if (key.startsWith("job:")) {
                try {
                  const job = decrypt<Job>(encrypted as string);
                  if (job.source === "linkedin") {
                    if (!since || job.postedAt >= since) {
                      jobs.push(job);
                    }
                  }
                } catch (error) {
                  console.warn(`Failed to decrypt job ${key}:`, error);
                }
              }
            }
          }

          return jobs;
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to get jobs by criteria: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    saveSession: (session: AuthSession): Effect.Effect<void, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const encrypted = encrypt(session);
          await keyv.set("auth:session", encrypted);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to save session: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    getSession: (): Effect.Effect<Option.Option<AuthSession>, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const encrypted = await keyv.get("auth:session");
          if (!encrypted) {
            return Option.none();
          }
          const session = decrypt<AuthSession>(encrypted);
          return Option.some(session);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to get session: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    deleteSession: (): Effect.Effect<void, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          await keyv.delete("auth:session");
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to delete session: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    saveJobRun: (run: JobRun): Effect.Effect<void, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const encrypted = encrypt(run);
          await keyv.set(`run:${run.id}`, encrypted);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to save job run: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    getLatestJobRun: (criteriaId: string): Effect.Effect<Option.Option<JobRun>, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const runs: readonly JobRun[] = [];
          const iterator = keyv.iterator?.({ namespace: "run" });

          if (iterator) {
            for await (const [key, encrypted] of iterator) {
              if (key.startsWith("run:")) {
                try {
                  const run = decrypt<JobRun>(encrypted as string);
                  if (run.criteriaId === criteriaId) {
                    runs.push(run);
                  }
                } catch (error) {
                  console.warn(`Failed to decrypt run ${key}:`, error);
                }
              }
            }
          }

          if (runs.length === 0) {
            return Option.none();
          }

          const latest = runs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
          return latest ? Option.some(latest) : Option.none();
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to get latest job run: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    saveJobScore: (score: JobScore): Effect.Effect<void, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const encrypted = encrypt(score);
          await keyv.set(`score:${score.jobId}:${score.scoredAt.getTime()}`, encrypted);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to save job score: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    getJobScores: (jobId: string): Effect.Effect<readonly JobScore[], StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const scores: readonly JobScore[] = [];
          const iterator = keyv.iterator?.({ namespace: "score" });

          if (iterator) {
            for await (const [key, encrypted] of iterator) {
              if (key.startsWith(`score:${jobId}:`)) {
                try {
                  const score = decrypt<JobScore>(encrypted as string);
                  scores.push(score);
                } catch (error) {
                  console.warn(`Failed to decrypt score ${key}:`, error);
                }
              }
            }
          }

          return scores.sort(
            (a, b) => b.scoredAt.getTime() - a.scoredAt.getTime(),
          ) as readonly JobScore[];
        },
        catch: (error) =>
          ({
            _tag: "StorageError" as const,
            type: "DATABASE_ERROR" as const,
            message: `Failed to get job scores: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    markJobAsSeen: (jobId: string): Effect.Effect<void, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          await keyv.set(`seen:${jobId}`, true);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to mark job as seen: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    isJobSeen: (jobId: string): Effect.Effect<boolean, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const seen = await keyv.get(`seen:${jobId}`);
          return Boolean(seen);
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to check if job is seen: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    getSeenJobIds: (): Effect.Effect<readonly string[], StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const seenIds: readonly string[] = [];
          const iterator = keyv.iterator?.({ namespace: "seen" });

          if (iterator) {
            for await (const [key] of iterator) {
              if (key.startsWith("seen:")) {
                const jobId = key.replace("seen:", "");
                seenIds.push(jobId);
              }
            }
          }

          return seenIds;
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to get seen job IDs: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },

    clearSeenJobs: (): Effect.Effect<void, StorageError> => {
      return Effect.tryPromise({
        try: async () => {
          const iterator = keyv.iterator?.({ namespace: "seen" });

          if (iterator) {
            for await (const [key] of iterator) {
              if (key.startsWith("seen:")) {
                await keyv.delete(key);
              }
            }
          }
        },
        catch: (error) =>
          ({
            _tag: "StorageError",
            type: "DATABASE_ERROR",
            message: `Failed to clear seen jobs: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as StorageError,
      });
    },
  };
};
