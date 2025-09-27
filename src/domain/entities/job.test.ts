import { describe, it, expect } from "vitest";

import type { Job, AuthSession, JobRun, JobScore, JobCriteria } from "./job.js";

describe("Job Entity", () => {
  it("should create a valid job with all required fields", () => {
    const job: Job = {
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
      techStack: ["React", "Node.js", "PostgreSQL"],
      description: "We are looking for a senior TypeScript developer...",
      applyUrl: "https://example.com/apply",
      source: "linkedin",
      createdAt: new Date("2024-01-15T10:00:00Z"),
      updatedAt: new Date("2024-01-15T10:00:00Z"),
    };

    expect(job.id.value).toBe("job-123");
    expect(job.title).toBe("Senior TypeScript Developer");
    expect(job.company).toBe("Tech Corp");
    expect(job.remotePolicy).toBe("REMOTE");
    expect(job.seniority).toBe("SENIOR");
    expect(job.employmentType).toBe("FULL_TIME");
    expect(job.languages).toEqual(["TypeScript", "JavaScript"]);
    expect(job.techStack).toEqual(["React", "Node.js", "PostgreSQL"]);
    expect(job.source).toBe("linkedin");
  });

  it("should handle unknown values for optional fields", () => {
    const job: Job = {
      id: { value: "job-456" },
      title: "Developer",
      company: "Unknown Company",
      location: "Unknown",
      remotePolicy: "UNKNOWN",
      seniority: "UNKNOWN",
      employmentType: "UNKNOWN",
      postedAt: new Date(),
      salaryHint: "",
      languages: [],
      techStack: [],
      description: "Job description",
      applyUrl: "https://example.com/apply",
      source: "linkedin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(job.remotePolicy).toBe("UNKNOWN");
    expect(job.seniority).toBe("UNKNOWN");
    expect(job.employmentType).toBe("UNKNOWN");
    expect(job.languages).toEqual([]);
    expect(job.techStack).toEqual([]);
  });
});

describe("AuthSession Entity", () => {
  it("should create a valid auth session", () => {
    const session: AuthSession = {
      id: "session-123",
      cookies: ["session_id=abc123", "csrf_token=xyz789"],
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(session.id).toBe("session-123");
    expect(session.cookies).toHaveLength(2);
    expect(session.cookies[0]).toBe("session_id=abc123");
    expect(session.cookies[1]).toBe("csrf_token=xyz789");
    expect(session.userAgent).toContain("Mozilla");
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("should detect expired session", () => {
    const expiredSession: AuthSession = {
      id: "session-expired",
      cookies: ["session_id=abc123"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(expiredSession.expiresAt.getTime()).toBeLessThan(Date.now());
  });
});

describe("JobRun Entity", () => {
  it("should create a valid job run", () => {
    const run: JobRun = {
      id: "run-123",
      criteriaId: "criteria-456",
      startedAt: new Date("2024-01-15T10:00:00Z"),
      completedAt: new Date("2024-01-15T10:05:00Z"),
      jobsFound: 25,
      jobsProcessed: 20,
      jobsScored: 15,
      errors: [],
      status: "COMPLETED",
    };

    expect(run.id).toBe("run-123");
    expect(run.criteriaId).toBe("criteria-456");
    expect(run.status).toBe("COMPLETED");
    expect(run.jobsFound).toBe(25);
    expect(run.jobsProcessed).toBe(20);
    expect(run.jobsScored).toBe(15);
    expect(run.errors).toEqual([]);
  });

  it("should handle running job run without completion", () => {
    const runningRun: JobRun = {
      id: "run-running",
      criteriaId: "criteria-789",
      startedAt: new Date(),
      jobsFound: 10,
      jobsProcessed: 5,
      jobsScored: 0,
      errors: [],
      status: "RUNNING",
    };

    expect(runningRun.status).toBe("RUNNING");
    expect(runningRun.completedAt).toBeUndefined();
  });

  it("should handle failed job run with errors", () => {
    const failedRun: JobRun = {
      id: "run-failed",
      criteriaId: "criteria-999",
      startedAt: new Date(),
      completedAt: new Date(),
      jobsFound: 5,
      jobsProcessed: 2,
      jobsScored: 0,
      errors: ["Network timeout", "Authentication failed"],
      status: "FAILED",
    };

    expect(failedRun.status).toBe("FAILED");
    expect(failedRun.errors).toHaveLength(2);
    expect(failedRun.errors[0]).toBe("Network timeout");
  });
});

describe("JobScore Entity", () => {
  it("should create a valid job score", () => {
    const score: JobScore = {
      jobId: "job-123",
      score: 85,
      rationale: "Strong match for TypeScript and React experience",
      gaps: ["Missing PostgreSQL experience", "No team lead experience"],
      cvVersion: "1.0",
      scoredAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(score.jobId).toBe("job-123");
    expect(score.score).toBe(85);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.rationale).toContain("Strong match");
    expect(score.gaps).toHaveLength(2);
    expect(score.cvVersion).toBe("1.0");
  });

  it("should handle perfect score", () => {
    const perfectScore: JobScore = {
      jobId: "job-perfect",
      score: 100,
      rationale: "Perfect match for all requirements",
      gaps: [],
      cvVersion: "2.0",
      scoredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(perfectScore.score).toBe(100);
    expect(perfectScore.gaps).toEqual([]);
  });

  it("should handle low score", () => {
    const lowScore: JobScore = {
      jobId: "job-low",
      score: 25,
      rationale: "Limited match - missing key skills",
      gaps: ["No TypeScript", "No React", "No Node.js", "Wrong seniority level"],
      cvVersion: "1.0",
      scoredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(lowScore.score).toBe(25);
    expect(lowScore.gaps).toHaveLength(4);
  });
});

describe("JobCriteria Entity", () => {
  it("should create a valid job criteria", () => {
    const criteria: JobCriteria = {
      id: "criteria-remote-ts",
      keywords: ["typescript", "react", "node.js"],
      location: "Remote",
      remotePolicy: "REMOTE",
      seniority: "SENIOR",
      employmentType: "FULL_TIME",
      enabled: true,
    };

    expect(criteria.id).toBe("criteria-remote-ts");
    expect(criteria.keywords).toEqual(["typescript", "react", "node.js"]);
    expect(criteria.location).toBe("Remote");
    expect(criteria.remotePolicy).toBe("REMOTE");
    expect(criteria.seniority).toBe("SENIOR");
    expect(criteria.employmentType).toBe("FULL_TIME");
    expect(criteria.enabled).toBe(true);
  });

  it("should handle disabled criteria", () => {
    const disabledCriteria: JobCriteria = {
      id: "criteria-disabled",
      keywords: ["python", "django"],
      location: "San Francisco",
      remotePolicy: "ONSITE",
      seniority: "MID",
      employmentType: "CONTRACT",
      enabled: false,
    };

    expect(disabledCriteria.enabled).toBe(false);
    expect(disabledCriteria.remotePolicy).toBe("ONSITE");
    expect(disabledCriteria.employmentType).toBe("CONTRACT");
  });
});
