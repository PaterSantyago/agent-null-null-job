import { Effect, Option } from "effect";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { LinkedInJobHunterConfig } from "@/domain/entities/config.js";
import type { Job, AuthSession, JobRun } from "@/domain/entities/job.js";
import type { LinkedInScraper } from "@/domain/ports/linkedin-scraper.js";
import type { LLMService } from "@/domain/ports/llm-service.js";
import type { StorageService } from "@/domain/ports/storage-service.js";
import type { TelegramService } from "@/domain/ports/telegram-service.js";

import { createNullNullJobService } from "./job-hunter-service.js";

describe("NullNullJobService", () => {
  const mockScraper: LinkedInScraper = {
    checkAuth: vi.fn(),
    login: vi.fn(),
    isLoggedIn: vi.fn(),
    scrapeJobs: vi.fn(),
  };

  const mockLLMService: LLMService = {
    extractJobData: vi.fn(),
    scoreJob: vi.fn(),
    prefilterJob: vi.fn().mockReturnValue(Effect.succeed(true)),
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

  const mockTelegram: TelegramService = {
    sendJobDigest: vi.fn().mockReturnValue(Effect.succeed(undefined)),
    sendJobAlert: vi.fn().mockReturnValue(Effect.succeed(undefined)),
    sendStatusUpdate: vi.fn().mockReturnValue(Effect.succeed(undefined)),
    sendErrorAlert: vi.fn().mockReturnValue(Effect.succeed(undefined)),
  };

  const config: LinkedInJobHunterConfig = {
    linkedin: {
      baseUrl: "https://www.linkedin.com",
      jobsUrl: "https://www.linkedin.com/jobs/search",
      loginUrl: "https://www.linkedin.com/login",
      requestDelay: 1000,
      maxRetries: 3,
      timeout: 30000,
    },
    llm: {
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4o-mini",
      maxTokens: 4000,
      temperature: 0.1,
    },
    telegram: {
      botToken: "test-token",
      chatId: "test-chat",
      enabled: true,
    },
    storage: {
      dataDir: "/tmp/test-data",
      encryptionKey: "test-key",
    },
    scoring: {
      minScore: 70,
      cvPath: "/tmp/cv.txt",
      cvVersion: "1.0",
    },
    criteria: [
      {
        id: "criteria-1",
        keywords: ["typescript", "react"],
        location: "Remote",
        remotePolicy: "REMOTE",
        seniority: "SENIOR",
        employmentType: "FULL_TIME",
        enabled: true,
      },
    ],
  };

  const service: ReturnType<typeof createNullNullJobService> = createNullNullJobService(
    config,
    mockScraper,
    mockLLMService,
    mockStorage,
    mockTelegram,
  );

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
    languages: ["TypeScript"],
    techStack: ["React"],
    description: `${title} at ${company}`,
    applyUrl: `https://example.com/jobs/${id}`,
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

  const createMockJobRun = (id: string, status: "RUNNING" | "COMPLETED" | "FAILED"): JobRun => ({
    id,
    criteriaId: "criteria-1",
    startedAt: new Date(),
    completedAt: status !== "RUNNING" ? new Date() : undefined,
    jobsFound: 10,
    jobsProcessed: 8,
    jobsScored: 5,
    errors: status === "FAILED" ? ["Some error"] : [],
    status,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticate", () => {
    it("should authenticate successfully", async () => {
      const session = createMockAuthSession();

      vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.none()));
      vi.mocked(mockScraper.login).mockReturnValue(Effect.succeed(session));
      vi.mocked(mockStorage.saveSession).mockReturnValue(Effect.succeed(undefined));

      const result = await Effect.runPromise(service.authenticate(false));

      expect(result).toEqual(session);
      expect(mockScraper.login).toHaveBeenCalledTimes(1);
      expect(mockStorage.saveSession).toHaveBeenCalledWith(session);
    });

    it("should force reauthentication when requested", async () => {
      const existingSession = createMockAuthSession();
      const newSession = createMockAuthSession();

      vi.mocked(mockStorage.getSession).mockReturnValue(
        Effect.succeed(Option.some(existingSession)),
      );
      vi.mocked(mockScraper.login).mockReturnValue(Effect.succeed(newSession));
      vi.mocked(mockStorage.saveSession).mockReturnValue(Effect.succeed(undefined));

      const result = await Effect.runPromise(service.authenticate(true));

      expect(result).toEqual(newSession);
      expect(mockScraper.login).toHaveBeenCalledTimes(1);
    });
  });

  describe("runJobDiscovery", () => {
    it("should run complete job discovery pipeline", async () => {
      const criteria = config.criteria[0];
      const session = createMockAuthSession();
      const scrapedJobs = [createMockJob("job-1", "TypeScript Developer", "Tech Corp")];
      const processedJob = createMockJob("job-1", "TypeScript Developer", "Tech Corp");
      const jobScore = {
        jobId: "job-1",
        score: 85,
        rationale: "Great match",
        gaps: [],
        cvVersion: "1.0",
        scoredAt: new Date(),
      };

      vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(session)));
      vi.mocked(mockScraper.isLoggedIn).mockReturnValue(Effect.succeed(true));
      vi.mocked(mockStorage.getJobsByCriteria).mockReturnValue(Effect.succeed([]));
      vi.mocked(mockScraper.scrapeJobs).mockReturnValue(Effect.succeed(scrapedJobs));
      vi.mocked(mockStorage.getSeenJobIds).mockReturnValue(Effect.succeed([]));
      vi.mocked(mockStorage.saveJob).mockReturnValue(Effect.succeed(processedJob));
      vi.mocked(mockStorage.markJobAsSeen).mockReturnValue(Effect.succeed(undefined));
      vi.mocked(mockLLMService.extractJobData).mockReturnValue(Effect.succeed(processedJob));
      vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
      vi.mocked(mockLLMService.scoreJob).mockReturnValue(Effect.succeed(jobScore));
      vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.succeed(undefined));
      vi.mocked(mockTelegram.sendJobDigest).mockReturnValue(Effect.succeed(undefined));
      vi.mocked(mockStorage.saveJobRun).mockReturnValue(Effect.succeed(undefined));

      const result = await Effect.runPromise(service.runJobDiscovery(criteria, false));

      expect(result.status).toBe("COMPLETED");
      expect(result.jobsFound).toBe(1);
      expect(result.jobsProcessed).toBe(1);
      expect(result.jobsScored).toBe(1);
      expect(mockTelegram.sendJobDigest).toHaveBeenCalledTimes(1);
    });

    it("should run dry run without LLM processing", async () => {
      const criteria = config.criteria[0];
      const session = createMockAuthSession();
      const scrapedJobs = [createMockJob("job-1", "TypeScript Developer", "Tech Corp")];

      vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(session)));
      vi.mocked(mockScraper.isLoggedIn).mockReturnValue(Effect.succeed(true));
      vi.mocked(mockStorage.getJobsByCriteria).mockReturnValue(Effect.succeed([]));
      vi.mocked(mockScraper.scrapeJobs).mockReturnValue(Effect.succeed(scrapedJobs));
      vi.mocked(mockStorage.getSeenJobIds).mockReturnValue(Effect.succeed([]));
      vi.mocked(mockStorage.saveJob).mockReturnValue(Effect.succeed(scrapedJobs[0]));
      vi.mocked(mockStorage.markJobAsSeen).mockReturnValue(Effect.succeed(undefined));
      vi.mocked(mockStorage.saveJobRun).mockReturnValue(Effect.succeed(undefined));

      const result = await Effect.runPromise(service.runJobDiscovery(criteria, true));

      expect(result.status).toBe("COMPLETED");
      expect(result.jobsFound).toBe(1);
      expect(result.jobsProcessed).toBe(0);
      expect(result.jobsScored).toBe(0);
      expect(mockLLMService.extractJobData).not.toHaveBeenCalled();
      expect(mockLLMService.scoreJob).not.toHaveBeenCalled();
    });
  });

  describe("scoreExistingJobs", () => {
    it("should score existing jobs", async () => {
      const criteria = config.criteria[0];
      const jobs = [createMockJob("job-1", "TypeScript Developer", "Tech Corp")];
      const jobScore = {
        jobId: "job-1",
        score: 85,
        rationale: "Great match",
        gaps: [],
        cvVersion: "1.0",
        scoredAt: new Date(),
      };

      vi.mocked(mockStorage.getJobsByCriteria).mockReturnValue(Effect.succeed(jobs));
      vi.mocked(mockStorage.getJobScores).mockReturnValue(Effect.succeed([]));
      vi.mocked(mockLLMService.scoreJob).mockReturnValue(Effect.succeed(jobScore));
      vi.mocked(mockStorage.saveJobScore).mockReturnValue(Effect.succeed(undefined));

      const result = await Effect.runPromise(service.scoreExistingJobs(criteria));

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(85);
      expect(mockLLMService.scoreJob).toHaveBeenCalledWith(jobs[0], "");
    });
  });

  describe("sendLastResults", () => {
    it("should send last results", async () => {
      const criteria = config.criteria[0];
      const jobs = [
        { ...createMockJob("job-1", "TypeScript Developer", "Tech Corp"), score: 85 },
        { ...createMockJob("job-2", "React Developer", "Startup Inc"), score: 60 },
      ];

      vi.mocked(mockStorage.getJobsByCriteria).mockReturnValue(Effect.succeed(jobs));
      vi.mocked(mockTelegram.sendJobDigest).mockReturnValue(Effect.succeed(undefined));

      await Effect.runPromise(service.sendLastResults(criteria));

      expect(mockTelegram.sendJobDigest).toHaveBeenCalledWith(
        [jobs[0]], // Only high-score jobs (>= 70)
        expect.stringMatching(/^replay-/),
      );
    });
  });

  describe("getStatus", () => {
    it("should return status with valid session", async () => {
      const session = createMockAuthSession();
      const lastRun = createMockJobRun("run-1", "COMPLETED");
      const jobs = [createMockJob("job-1", "TypeScript Developer", "Tech Corp")];

      vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(session)));
      vi.mocked(mockStorage.getLatestJobRun).mockReturnValue(Effect.succeed(Option.some(lastRun)));
      vi.mocked(mockStorage.getJobsByCriteria).mockReturnValue(Effect.succeed(jobs));

      const result = await Effect.runPromise(service.getStatus());

      expect(result.sessionValid).toBe(true);
      expect(result.lastRun).toEqual(lastRun);
      expect(result.totalJobs).toBe(1);
      expect(result.highScoreJobs).toBe(0); // No jobs with score >= 70
      expect(result.tokenSpend).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should return status with no session", async () => {
      vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.none()));
      vi.mocked(mockStorage.getLatestJobRun).mockReturnValue(Effect.succeed(Option.none()));
      vi.mocked(mockStorage.getJobsByCriteria).mockReturnValue(Effect.succeed([]));

      const result = await Effect.runPromise(service.getStatus());

      expect(result.sessionValid).toBe(false);
      expect(result.lastRun).toBeUndefined();
      expect(result.totalJobs).toBe(0);
      expect(result.highScoreJobs).toBe(0);
    });
  });

  describe("purgeCache", () => {
    it("should purge cache only", async () => {
      vi.mocked(mockStorage.clearSeenJobs).mockReturnValue(Effect.succeed(undefined));

      await Effect.runPromise(service.purgeCache("cache"));

      expect(mockStorage.clearSeenJobs).toHaveBeenCalledTimes(1);
      expect(mockStorage.deleteSession).not.toHaveBeenCalled();
    });

    it("should purge all data", async () => {
      vi.mocked(mockStorage.deleteSession).mockReturnValue(Effect.succeed(undefined));
      vi.mocked(mockStorage.clearSeenJobs).mockReturnValue(Effect.succeed(undefined));

      await Effect.runPromise(service.purgeCache("all"));

      expect(mockStorage.deleteSession).toHaveBeenCalledTimes(1);
      expect(mockStorage.clearSeenJobs).toHaveBeenCalledTimes(1);
    });
  });
});
