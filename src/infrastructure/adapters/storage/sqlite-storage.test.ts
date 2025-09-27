import { Effect, Option } from "effect";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Job, AuthSession, JobRun, JobScore } from "@/domain/entities/job.js";

import { createSqliteStorageService } from "./sqlite-storage.js";

// Mock keyv and related modules
vi.mock("keyv", () => ({
  default: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    iterator: vi.fn(),
  })),
}));

vi.mock("@keyv/sqlite", () => ({
  default: vi.fn(),
}));

vi.mock("crypto-js", () => ({
  default: {
    AES: {
      encrypt: vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue("encrypted-data"),
      }),
      decrypt: vi.fn().mockImplementation((data: string) => {
        // Return different data based on what's being decrypted
        if (data.includes("job-")) {
          return {
            toString: vi.fn().mockReturnValue(
              JSON.stringify({
                id: { value: "job-123" },
                title: "Test Job",
                company: "Test Company",
                location: "Test Location",
                remotePolicy: "REMOTE",
                seniority: "SENIOR",
                employmentType: "FULL_TIME",
                postedAt: "2025-09-26T20:10:39.650Z",
                salaryHint: "100k-150k",
                languages: ["TypeScript"],
                techStack: ["React"],
                description: "Test description",
                applyUrl: "https://example.com/apply",
                source: "linkedin",
                createdAt: "2025-09-26T20:10:39.650Z",
                updatedAt: "2025-09-26T20:10:39.650Z",
              }),
            ),
          };
        } else if (data.includes("session-")) {
          return {
            toString: vi.fn().mockReturnValue(
              JSON.stringify({
                id: "session-123",
                cookies: ["cookie1=value1", "cookie2=value2"],
                userAgent: "Mozilla/5.0",
                expiresAt: "2025-09-27T20:10:39.693Z",
                createdAt: "2025-09-26T20:10:39.693Z",
              }),
            ),
          };
        } else if (data.includes("run-")) {
          return {
            toString: vi.fn().mockReturnValue(
              JSON.stringify({
                id: "run-123",
                criteriaId: "criteria-123",
                startedAt: "2025-09-26T20:10:39.650Z",
                completedAt: "2025-09-26T20:15:39.650Z",
                jobsFound: 5,
                jobsProcessed: 4,
                jobsScored: 3,
                tokenSpend: 1000,
                errors: [],
              }),
            ),
          };
        } else if (data.includes("score-")) {
          return {
            toString: vi.fn().mockReturnValue(
              JSON.stringify({
                jobId: "job-123",
                score: 85,
                rationale: "Good match",
                gaps: ["Missing React experience"],
                scoredAt: "2025-09-26T20:10:39.650Z",
              }),
            ),
          };
        }
        return {
          toString: vi.fn().mockReturnValue('{"id":"test","value":"data"}'),
        };
      }),
    },
    enc: {
      Utf8: "utf8",
    },
  },
}));

describe("createSqliteStorageService", () => {
  const mockKeyv = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    iterator: vi.fn(),
  };

  let storage: ReturnType<typeof createSqliteStorageService>;

  const createMockJob = (id: string): Job => ({
    id: { value: id },
    title: "Test Job",
    company: "Test Company",
    location: "Remote",
    remotePolicy: "REMOTE",
    seniority: "SENIOR",
    employmentType: "FULL_TIME",
    postedAt: new Date(),
    salaryHint: "",
    languages: [],
    techStack: [],
    description: "Test description",
    applyUrl: "https://example.com/apply",
    source: "linkedin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockAuthSession = (): AuthSession => ({
    id: "session-123",
    cookies: ["session_id=abc123"],
    userAgent: "Mozilla/5.0",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  const createMockJobRun = (id: string): JobRun => ({
    id,
    criteriaId: "criteria-1",
    startedAt: new Date(),
    completedAt: new Date(),
    jobsFound: 10,
    jobsProcessed: 8,
    jobsScored: 5,
    errors: [],
    status: "COMPLETED",
  });

  const createMockJobScore = (jobId: string): JobScore => ({
    jobId,
    score: 85,
    rationale: "Great match",
    gaps: [],
    cvVersion: "1.0",
    scoredAt: new Date(),
  });

  beforeEach(async () => {
    // Reset mock functions
    mockKeyv.set = vi.fn().mockResolvedValue(undefined);
    mockKeyv.get = vi.fn().mockResolvedValue(undefined);
    mockKeyv.delete = vi.fn().mockResolvedValue(undefined);
    mockKeyv.iterator = vi.fn().mockReturnValue(undefined);

    // Mock the Keyv constructor to return our mock
    const { default: Keyv } = await import("keyv");
    vi.mocked(Keyv).mockImplementation(() => mockKeyv);
    vi.clearAllMocks();

    // Create storage service with fresh mocks
    storage = createSqliteStorageService({
      dataDir: "/tmp/test",
      encryptionKey: "test-key",
    });
  });

  describe("saveJob", () => {
    it("should save job successfully", async () => {
      const job = createMockJob("job-123");

      const result = await Effect.runPromise(storage.saveJob(job));

      expect(result).toEqual(job);
      expect(mockKeyv.set).toHaveBeenCalledWith("job:job-123", "encrypted-data");
    });

    it("should handle save error", async () => {
      const job = createMockJob("job-123");
      const error = new Error("Database error");

      mockKeyv.set.mockRejectedValue(error);

      await expect(Effect.runPromise(storage.saveJob(job))).rejects.toThrow();
    });
  });

  describe("getJob", () => {
    it("should return job when found", async () => {
      const job = createMockJob("job-123");
      mockKeyv.get.mockResolvedValue("encrypted-data");

      // Mock the decrypt function to return our job
      const { default: CryptoJS } = await import("crypto-js");
      vi.mocked(CryptoJS.AES.decrypt).mockReturnValue({
        toString: vi.fn().mockReturnValue(
          JSON.stringify({
            ...job,
            postedAt: job.postedAt.toISOString(),
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
          }),
        ),
      });

      const result = await Effect.runPromise(storage.getJob("job-123"));

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.id).toEqual(job.id);
        expect(result.value.title).toEqual(job.title);
        expect(result.value.company).toEqual(job.company);
        expect(result.value.location).toEqual(job.location);
        expect(result.value.remotePolicy).toEqual(job.remotePolicy);
        expect(result.value.seniority).toEqual(job.seniority);
        expect(result.value.employmentType).toEqual(job.employmentType);
        expect(result.value.description).toEqual(job.description);
        expect(result.value.applyUrl).toEqual(job.applyUrl);
        expect(result.value.source).toEqual(job.source);
        expect(result.value.salaryHint).toEqual(job.salaryHint);
        expect(result.value.languages).toEqual(job.languages);
        expect(result.value.techStack).toEqual(job.techStack);
        // Dates are converted to strings during JSON serialization
        expect(result.value.postedAt).toBeInstanceOf(Date);
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
      expect(mockKeyv.get).toHaveBeenCalledWith("job:job-123");
    });

    it("should return none when job not found", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const result = await Effect.runPromise(storage.getJob("job-123"));

      expect(Option.isNone(result)).toBe(true);
    });

    it("should handle get error", async () => {
      const error = new Error("Database error");
      mockKeyv.get.mockRejectedValue(error);

      await expect(Effect.runPromise(storage.getJob("job-123"))).rejects.toThrow();
    });
  });

  describe("getJobsByCriteria", () => {
    it("should return jobs matching criteria", async () => {
      const job1 = createMockJob("job-1");
      const job2 = createMockJob("job-2");
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield ["job:job-1", "encrypted-data-1"];
          yield ["job:job-2", "encrypted-data-2"];
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      // Mock decrypt to return different jobs
      const { default: CryptoJS } = await import("crypto-js");
      vi.mocked(CryptoJS.AES.decrypt)
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...job1,
              postedAt: job1.postedAt.toISOString(),
              createdAt: job1.createdAt.toISOString(),
              updatedAt: job1.updatedAt.toISOString(),
            }),
          ),
        })
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...job2,
              postedAt: job2.postedAt.toISOString(),
              createdAt: job2.createdAt.toISOString(),
              updatedAt: job2.updatedAt.toISOString(),
            }),
          ),
        });

      const result = await Effect.runPromise(storage.getJobsByCriteria("criteria-1"));

      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(job1.id);
      expect(result[0].title).toEqual(job1.title);
      expect(result[1].id).toEqual(job2.id);
      expect(result[1].title).toEqual(job2.title);
    });

    it("should filter jobs by since date", async () => {
      const oldJob = {
        ...createMockJob("job-old"),
        postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      const newJob = {
        ...createMockJob("job-new"),
        postedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield ["job:job-old", "encrypted-data-old"];
          yield ["job:job-new", "encrypted-data-new"];
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      const { default: CryptoJS } = await import("crypto-js");
      vi.mocked(CryptoJS.AES.decrypt)
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...oldJob,
              postedAt: oldJob.postedAt.toISOString(),
              createdAt: oldJob.createdAt.toISOString(),
              updatedAt: oldJob.updatedAt.toISOString(),
            }),
          ),
        })
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...newJob,
              postedAt: newJob.postedAt.toISOString(),
              createdAt: newJob.createdAt.toISOString(),
              updatedAt: newJob.updatedAt.toISOString(),
            }),
          ),
        });

      const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const result = await Effect.runPromise(storage.getJobsByCriteria("criteria-1", since));

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(newJob.id);
      expect(result[0].title).toEqual(newJob.title);
    });

    it("should handle iterator error", async () => {
      const error = new Error("Iterator error");
      mockKeyv.iterator.mockRejectedValue(error);

      await expect(Effect.runPromise(storage.getJobsByCriteria("criteria-1"))).rejects.toThrow();
    });
  });

  describe("saveSession", () => {
    it("should save session successfully", async () => {
      const session = createMockAuthSession();

      await Effect.runPromise(storage.saveSession(session));

      expect(mockKeyv.set).toHaveBeenCalledWith("auth:session", "encrypted-data");
    });

    it("should handle save session error", async () => {
      const session = createMockAuthSession();
      const error = new Error("Database error");

      mockKeyv.set.mockRejectedValue(error);

      await expect(Effect.runPromise(storage.saveSession(session))).rejects.toThrow();
    });
  });

  describe("getSession", () => {
    it("should return session when found", async () => {
      const session = createMockAuthSession();
      mockKeyv.get.mockResolvedValue("encrypted-data");

      const { default: CryptoJS } = await import("crypto-js");
      vi.mocked(CryptoJS.AES.decrypt).mockReturnValue({
        toString: vi.fn().mockReturnValue(
          JSON.stringify({
            ...session,
            expiresAt: session.expiresAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
          }),
        ),
      });

      const result = await Effect.runPromise(storage.getSession());

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.id).toEqual(session.id);
        expect(result.value.cookies).toEqual(session.cookies);
        expect(result.value.userAgent).toEqual(session.userAgent);
        expect(result.value.expiresAt).toBeInstanceOf(Date);
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should return none when session not found", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const result = await Effect.runPromise(storage.getSession());

      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe("deleteSession", () => {
    it("should delete session successfully", async () => {
      await Effect.runPromise(storage.deleteSession());

      expect(mockKeyv.delete).toHaveBeenCalledWith("auth:session");
    });

    it("should handle delete session error", async () => {
      const error = new Error("Database error");
      mockKeyv.delete.mockRejectedValue(error);

      await expect(Effect.runPromise(storage.deleteSession())).rejects.toThrow();
    });
  });

  describe("saveJobRun", () => {
    it("should save job run successfully", async () => {
      const run = createMockJobRun("run-123");

      await Effect.runPromise(storage.saveJobRun(run));

      expect(mockKeyv.set).toHaveBeenCalledWith("run:run-123", "encrypted-data");
    });
  });

  describe("getLatestJobRun", () => {
    it("should return latest job run", async () => {
      const run1 = createMockJobRun("run-1");
      const run2 = createMockJobRun("run-2");
      run2.startedAt = new Date(run1.startedAt.getTime() + 1000); // 1 second later

      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield ["run:run-1", "encrypted-data-1"];
          yield ["run:run-2", "encrypted-data-2"];
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      const { default: CryptoJS } = await import("crypto-js");
      vi.mocked(CryptoJS.AES.decrypt)
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...run1,
              startedAt: run1.startedAt.toISOString(),
              completedAt: run1.completedAt?.toISOString(),
            }),
          ),
        })
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...run2,
              startedAt: run2.startedAt.toISOString(),
              completedAt: run2.completedAt?.toISOString(),
            }),
          ),
        });

      const result = await Effect.runPromise(storage.getLatestJobRun("criteria-1"));

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.id).toBe("run-2"); // Should return the later one
        expect(result.value.startedAt).toBeInstanceOf(Date);
        expect(result.value.completedAt).toBeInstanceOf(Date);
      }
    });

    it("should return none when no runs found", async () => {
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          // No runs
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      const result = await Effect.runPromise(storage.getLatestJobRun("criteria-1"));

      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe("saveJobScore", () => {
    it("should save job score successfully", async () => {
      const score = createMockJobScore("job-123");

      await Effect.runPromise(storage.saveJobScore(score));

      expect(mockKeyv.set).toHaveBeenCalledWith(
        `score:${score.jobId}:${score.scoredAt.getTime()}`,
        "encrypted-data",
      );
    });
  });

  describe("getJobScores", () => {
    it("should return job scores sorted by date", async () => {
      const score1 = createMockJobScore("job-123");
      const score2 = createMockJobScore("job-123");
      score2.scoredAt = new Date(score1.scoredAt.getTime() + 1000); // 1 second later

      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield [`score:job-123:${score1.scoredAt.getTime()}`, "encrypted-data-1"];
          yield [`score:job-123:${score2.scoredAt.getTime()}`, "encrypted-data-2"];
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      const { default: CryptoJS } = await import("crypto-js");
      vi.mocked(CryptoJS.AES.decrypt)
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...score1,
              scoredAt: score1.scoredAt.toISOString(),
            }),
          ),
        })
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue(
            JSON.stringify({
              ...score2,
              scoredAt: score2.scoredAt.toISOString(),
            }),
          ),
        });

      const result = await Effect.runPromise(storage.getJobScores("job-123"));

      expect(result).toHaveLength(2);
      expect(result[0].jobId).toEqual(score2.jobId); // Should be sorted by date descending
      expect(result[0].score).toEqual(score2.score);
      expect(result[1].jobId).toEqual(score1.jobId);
      expect(result[1].score).toEqual(score1.score);
    });
  });

  describe("markJobAsSeen", () => {
    it("should mark job as seen", async () => {
      await Effect.runPromise(storage.markJobAsSeen("job-123"));

      expect(mockKeyv.set).toHaveBeenCalledWith("seen:job-123", true);
    });
  });

  describe("isJobSeen", () => {
    it("should return true when job is seen", async () => {
      mockKeyv.get.mockResolvedValue(true);

      const result = await Effect.runPromise(storage.isJobSeen("job-123"));

      expect(result).toBe(true);
      expect(mockKeyv.get).toHaveBeenCalledWith("seen:job-123");
    });

    it("should return false when job is not seen", async () => {
      mockKeyv.get.mockResolvedValue(undefined);

      const result = await Effect.runPromise(storage.isJobSeen("job-123"));

      expect(result).toBe(false);
    });
  });

  describe("getSeenJobIds", () => {
    it("should return seen job IDs", async () => {
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield ["seen:job-1", true];
          yield ["seen:job-2", true];
          yield ["other:key", "value"]; // Should be filtered out
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      const result = await Effect.runPromise(storage.getSeenJobIds());

      expect(result).toEqual(["job-1", "job-2"]);
    });
  });

  describe("clearSeenJobs", () => {
    it("should clear all seen jobs", async () => {
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield ["seen:job-1", true];
          yield ["seen:job-2", true];
        },
      };

      mockKeyv.iterator.mockReturnValue(mockIterator);

      await Effect.runPromise(storage.clearSeenJobs());

      expect(mockKeyv.delete).toHaveBeenCalledWith("seen:job-1");
      expect(mockKeyv.delete).toHaveBeenCalledWith("seen:job-2");
    });
  });
});
