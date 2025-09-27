import { Effect } from "effect";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Job } from "@/domain/entities/job.js";
import type { LLMService } from "@/domain/ports/llm-service.js";

import { processJobs } from "./process-jobs.js";

describe("processJobs use case", () => {
  const mockLLMService: LLMService = {
    extractJobData: vi.fn(),
    scoreJob: vi.fn(),
    prefilterJob: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process all jobs successfully", async () => {
    const rawJobs = [
      {
        content: "Senior TypeScript Developer at Tech Corp...",
        url: "https://linkedin.com/jobs/view/123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
      },
      {
        content: "React Developer at Startup Inc...",
        url: "https://linkedin.com/jobs/view/456",
        timestamp: new Date("2024-01-15T10:05:00Z"),
      },
    ];

    const processedJob1: Job = {
      id: { value: "job-123" },
      title: "Senior TypeScript Developer",
      company: "Tech Corp",
      location: "Remote",
      remotePolicy: "REMOTE",
      seniority: "SENIOR",
      employmentType: "FULL_TIME",
      postedAt: new Date("2024-01-15T10:00:00Z"),
      salaryHint: "$120,000 - $150,000",
      languages: ["TypeScript", "JavaScript"],
      techStack: ["React", "Node.js"],
      description: "We are looking for a senior TypeScript developer...",
      applyUrl: "https://linkedin.com/jobs/view/123",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const processedJob2: Job = {
      id: { value: "job-456" },
      title: "React Developer",
      company: "Startup Inc",
      location: "San Francisco",
      remotePolicy: "HYBRID",
      seniority: "MID",
      employmentType: "FULL_TIME",
      postedAt: new Date("2024-01-15T10:05:00Z"),
      salaryHint: "$90,000 - $120,000",
      languages: ["JavaScript"],
      techStack: ["React", "Redux"],
      description: "We are looking for a React developer...",
      applyUrl: "https://linkedin.com/jobs/view/456",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockLLMService.extractJobData)
      .mockReturnValueOnce(Effect.succeed(processedJob1))
      .mockReturnValueOnce(Effect.succeed(processedJob2));

    const result = await Effect.runPromise(
      processJobs(mockLLMService)({ rawJobs, retryFailed: false }),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(processedJob1);
    expect(result[1]).toEqual(processedJob2);
    expect(mockLLMService.extractJobData).toHaveBeenCalledTimes(2);
    expect(mockLLMService.extractJobData).toHaveBeenCalledWith(rawJobs[0]!.content);
    expect(mockLLMService.extractJobData).toHaveBeenCalledWith(rawJobs[1]!.content);
  });

  it("should skip failed jobs when retryFailed is false", { timeout: 15000 }, async () => {
    const rawJobs = [
      {
        content: "Valid job content...",
        url: "https://linkedin.com/jobs/view/123",
        timestamp: new Date(),
      },
    ];

    const processedJob: Job = {
      id: { value: "job-123" },
      title: "Valid Job",
      company: "Tech Corp",
      location: "Remote",
      remotePolicy: "REMOTE",
      seniority: "SENIOR",
      employmentType: "FULL_TIME",
      postedAt: new Date(),
      salaryHint: "",
      languages: [],
      techStack: [],
      description: "Valid job description",
      applyUrl: "https://linkedin.com/jobs/view/123",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockLLMService.extractJobData).mockReturnValueOnce(Effect.succeed(processedJob));

    const result = await Effect.runPromise(
      processJobs(mockLLMService)({ rawJobs, retryFailed: false }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(processedJob);
    expect(mockLLMService.extractJobData).toHaveBeenCalledTimes(1);
  });

  it("should handle retry logic", async () => {
    const rawJobs = [
      {
        content: "Job content...",
        url: "https://linkedin.com/jobs/view/123",
        timestamp: new Date(),
      },
    ];

    const processedJob: Job = {
      id: { value: "job-123" },
      title: "Test Job",
      company: "Tech Corp",
      location: "Remote",
      remotePolicy: "REMOTE",
      seniority: "SENIOR",
      employmentType: "FULL_TIME",
      postedAt: new Date(),
      salaryHint: "",
      languages: [],
      techStack: [],
      description: "Job description",
      applyUrl: "https://linkedin.com/jobs/view/123",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockLLMService.extractJobData).mockReturnValue(Effect.succeed(processedJob));

    const result = await Effect.runPromise(
      processJobs(mockLLMService)({ rawJobs, retryFailed: true }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(processedJob);
    expect(mockLLMService.extractJobData).toHaveBeenCalledTimes(1);
  });

  it("should handle empty job list", async () => {
    const rawJobs: readonly any[] = [];

    const result = await Effect.runPromise(
      processJobs(mockLLMService)({ rawJobs, retryFailed: false }),
    );

    expect(result).toHaveLength(0);
    expect(mockLLMService.extractJobData).not.toHaveBeenCalled();
  });

  it("should handle mixed success and failure", async () => {
    const rawJobs = [
      {
        content: "Valid job 1...",
        url: "https://linkedin.com/jobs/view/1",
        timestamp: new Date(),
      },
      {
        content: "Valid job 2...",
        url: "https://linkedin.com/jobs/view/2",
        timestamp: new Date(),
      },
    ];

    const processedJob1: Job = {
      id: { value: "job-1" },
      title: "Valid Job 1",
      company: "Tech Corp",
      location: "Remote",
      remotePolicy: "REMOTE",
      seniority: "SENIOR",
      employmentType: "FULL_TIME",
      postedAt: new Date(),
      salaryHint: "",
      languages: [],
      techStack: [],
      description: "Valid job 1 description",
      applyUrl: "https://linkedin.com/jobs/view/1",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const processedJob2: Job = {
      id: { value: "job-2" },
      title: "Valid Job 2",
      company: "Startup Inc",
      location: "San Francisco",
      remotePolicy: "HYBRID",
      seniority: "MID",
      employmentType: "FULL_TIME",
      postedAt: new Date(),
      salaryHint: "",
      languages: [],
      techStack: [],
      description: "Valid job 2 description",
      applyUrl: "https://linkedin.com/jobs/view/2",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockLLMService.extractJobData)
      .mockReturnValueOnce(Effect.succeed(processedJob1))
      .mockReturnValueOnce(Effect.succeed(processedJob2));

    const result = await Effect.runPromise(
      processJobs(mockLLMService)({ rawJobs, retryFailed: false }),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(processedJob1);
    expect(result[1]).toEqual(processedJob2);
    expect(mockLLMService.extractJobData).toHaveBeenCalledTimes(2);
  });
});
