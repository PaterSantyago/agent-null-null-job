import { Effect } from "effect";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Job, JobScore } from "@/domain/entities/job.js";
import type { LLMService, LLMError } from "@/domain/ports/llm-service.js";
import type { StorageService, StorageError } from "@/domain/ports/storage-service.js";

import { scoreJobs } from "./score-jobs.js";

describe("scoreJobs use case", () => {
  const mockLLMService: LLMService = {
    extractJobData: vi.fn(),
    scoreJob: vi.fn(),
    prefilterJob: vi.fn(),
  };

  const mockStorage: StorageService = {
    saveJob: vi.fn(),
    getJob: vi.fn(),
    getJobsByCriteria: vi.fn(),
    saveSession: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    saveJobRun: vi.fn(),
    getLatestJobRun: vi.fn(),
    saveJobScore: vi.fn(),
    getJobScores: vi.fn(),
    markJobAsSeen: vi.fn(),
    isJobSeen: vi.fn(),
    getSeenJobIds: vi.fn(),
    clearSeenJobs: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockJob = (id: string, title: string, company: string): Job => ({
    id: { value: id },
    title,
    company,
    location: "Remote",
    remotePolicy: "REMOTE",
    seniority: "SENIOR",
    employmentType: "FULL_TIME",
    postedAt: new Date(),
    salaryHint: "",
    languages: ["TypeScript", "JavaScript"],
    techStack: ["React", "Node.js"],
    description: `${title} at ${company}`,
    applyUrl: `https://example.com/jobs/${id}`,
    source: "linkedin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockJobScore = (jobId: string, score: number): JobScore => ({
    jobId,
    score,
    rationale: `Score ${score} rationale`,
    gaps: score < 70 ? ["Missing some skills"] : [],
    cvVersion: "1.0",
    scoredAt: new Date(),
  });

  it("should score jobs and return those above minimum score", async () => {
    const jobs = [
      createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp"),
      createMockJob("job-2", "React Developer", "Startup Inc"),
    ];

    const jobScore1 = createMockJobScore("job-1", 85);
    const jobScore2 = createMockJobScore("job-2", 60);

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
    vi.mocked(mockLLMService.scoreJob)
      .mockReturnValueOnce(Effect.succeed(jobScore1))
      .mockReturnValueOnce(Effect.succeed(jobScore2));
    vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      scoreJobs(
        mockLLMService,
        mockStorage,
      )({
        jobs,
        cvContent: "Experienced TypeScript developer...",
        cvVersion: "1.0",
        minScore: 70,
        usePrefilter: false,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id.value).toBe("job-1");
    expect(result[0].score).toBe(85);
    expect(mockLLMService.scoreJob).toHaveBeenCalledTimes(2);
    expect(mockStorage.saveJobScore).toHaveBeenCalledTimes(2);
  });

  it("should use existing recent scores when available", async () => {
    const jobs = [createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp")];
    const existingScore = createMockJobScore("job-1", 90);

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([existingScore]));

    const result = await Effect.runPromise(
      scoreJobs(
        mockLLMService,
        mockStorage,
      )({
        jobs,
        cvContent: "Experienced TypeScript developer...",
        cvVersion: "1.0",
        minScore: 70,
        usePrefilter: false,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(90);
    expect(mockLLMService.scoreJob).not.toHaveBeenCalled();
    expect(mockStorage.saveJobScore).not.toHaveBeenCalled();
  });

  it("should prefilter jobs when usePrefilter is true", async () => {
    const jobs = [
      createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp"),
      createMockJob("job-2", "Python Developer", "Data Corp"),
    ];

    const jobScore1 = createMockJobScore("job-1", 85);

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
    vi.mocked(mockLLMService.prefilterJob)
      .mockReturnValueOnce(Effect.succeed(true))
      .mockReturnValueOnce(Effect.succeed(false));
    vi.mocked(mockLLMService.scoreJob).mockReturnValue(Effect.succeed(jobScore1));
    vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      scoreJobs(
        mockLLMService,
        mockStorage,
      )({
        jobs,
        cvContent: "Experienced TypeScript developer...",
        cvVersion: "1.0",
        minScore: 70,
        usePrefilter: true,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id.value).toBe("job-1");
    expect(mockLLMService.prefilterJob).toHaveBeenCalledTimes(2);
    expect(mockLLMService.scoreJob).toHaveBeenCalledTimes(1);
  });

  it("should handle prefilter failure gracefully", async () => {
    const jobs = [createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp")];
    const jobScore1 = createMockJobScore("job-1", 85);

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
    vi.mocked(mockLLMService.prefilterJob).mockReturnValue(Effect.succeed(true));
    vi.mocked(mockLLMService.scoreJob).mockReturnValue(Effect.succeed(jobScore1));
    vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      scoreJobs(
        mockLLMService,
        mockStorage,
      )({
        jobs,
        cvContent: "Experienced TypeScript developer...",
        cvVersion: "1.0",
        minScore: 70,
        usePrefilter: true,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id.value).toBe("job-1");
  });

  it("should handle storage error when getting existing scores", async () => {
    const jobs = [createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp")];
    const storageError: StorageError = {
      _tag: "StorageError",
      type: "DATABASE_ERROR",
      message: "Database connection failed",
    };

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.fail(storageError));

    await expect(
      Effect.runPromise(
        scoreJobs(
          mockLLMService,
          mockStorage,
        )({
          jobs,
          cvContent: "Experienced TypeScript developer...",
          cvVersion: "1.0",
          minScore: 70,
          usePrefilter: false,
        }),
      ),
    ).rejects.toThrow();
  });

  it("should handle LLM error when scoring job", async () => {
    const jobs = [createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp")];
    const llmError: LLMError = {
      _tag: "LLMError",
      type: "API_ERROR",
      message: "API rate limit exceeded",
    };

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
    vi.mocked(mockLLMService.scoreJob).mockReturnValue(Effect.fail(llmError));

    await expect(
      Effect.runPromise(
        scoreJobs(
          mockLLMService,
          mockStorage,
        )({
          jobs,
          cvContent: "Experienced TypeScript developer...",
          cvVersion: "1.0",
          minScore: 70,
          usePrefilter: false,
        }),
      ),
    ).rejects.toThrow();
  });

  it("should handle storage error when saving job score", async () => {
    const jobs = [createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp")];
    const jobScore1 = createMockJobScore("job-1", 85);
    const storageError: StorageError = {
      _tag: "StorageError",
      type: "DATABASE_ERROR",
      message: "Failed to save score",
    };

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
    vi.mocked(mockLLMService.scoreJob).mockReturnValue(Effect.succeed(jobScore1));
    vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.fail(storageError));

    await expect(
      Effect.runPromise(
        scoreJobs(
          mockLLMService,
          mockStorage,
        )({
          jobs,
          cvContent: "Experienced TypeScript developer...",
          cvVersion: "1.0",
          minScore: 70,
          usePrefilter: false,
        }),
      ),
    ).rejects.toThrow();
  });

  it("should return empty array when no jobs provided", async () => {
    const result = await Effect.runPromise(
      scoreJobs(
        mockLLMService,
        mockStorage,
      )({
        jobs: [],
        cvContent: "Experienced TypeScript developer...",
        cvVersion: "1.0",
        minScore: 70,
        usePrefilter: false,
      }),
    );

    expect(result).toHaveLength(0);
    expect(mockLLMService.scoreJob).not.toHaveBeenCalled();
  });

  it("should filter out jobs below minimum score", async () => {
    const jobs = [
      createMockJob("job-1", "Senior TypeScript Developer", "Tech Corp"),
      createMockJob("job-2", "Junior Developer", "Startup Inc"),
    ];

    const jobScore1 = createMockJobScore("job-1", 85);
    const jobScore2 = createMockJobScore("job-2", 45);

    vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
    vi.mocked(mockLLMService.scoreJob)
      .mockReturnValueOnce(Effect.succeed(jobScore1))
      .mockReturnValueOnce(Effect.succeed(jobScore2));
    vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      scoreJobs(
        mockLLMService,
        mockStorage,
      )({
        jobs,
        cvContent: "Experienced TypeScript developer...",
        cvVersion: "1.0",
        minScore: 70,
        usePrefilter: false,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id.value).toBe("job-1");
    expect(result[0].score).toBe(85);
  });
});
