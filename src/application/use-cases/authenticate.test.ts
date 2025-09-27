import { Effect, Option } from "effect";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AuthSession } from "@/domain/entities/job.js";
import type { LinkedInScraper, ScrapingError } from "@/domain/ports/linkedin-scraper.js";
import type { StorageService, StorageError } from "@/domain/ports/storage-service.js";

import { authenticate } from "./authenticate.js";

describe("authenticate use case", () => {
  const mockScraper: LinkedInScraper = {
    checkAuth: vi.fn(),
    login: vi.fn(),
    isLoggedIn: vi.fn(),
    scrapeJobs: vi.fn(),
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

  it("should return existing valid session when not forcing reauth", async () => {
    const validSession: AuthSession = {
      id: "session-123",
      cookies: ["session_id=abc123"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(validSession)));
    vi.mocked(mockScraper.isLoggedIn).mockReturnValue(Effect.succeed(true));

    const result = await Effect.runPromise(
      authenticate(mockScraper, mockStorage)({ forceReauth: false }),
    );

    expect(result).toEqual(validSession);
    expect(mockStorage.getSession).toHaveBeenCalledTimes(1);
    expect(mockScraper.isLoggedIn).toHaveBeenCalledWith(validSession);
    expect(mockScraper.login).not.toHaveBeenCalled();
  });

  it("should delete expired session and login when session is invalid", async () => {
    const expiredSession: AuthSession = {
      id: "session-expired",
      cookies: ["session_id=abc123"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newSession: AuthSession = {
      id: "session-new",
      cookies: ["session_id=xyz789"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(expiredSession)));
    vi.mocked(mockScraper.isLoggedIn).mockReturnValue(Effect.succeed(false));
    vi.mocked(mockStorage.deleteSession).mockReturnValue(Effect.succeed(undefined));
    vi.mocked(mockScraper.login).mockReturnValue(Effect.succeed(newSession));
    vi.mocked(mockStorage.saveSession).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      authenticate(mockScraper, mockStorage)({ forceReauth: false }),
    );

    expect(result).toEqual(newSession);
    expect(mockStorage.deleteSession).toHaveBeenCalledTimes(1);
    expect(mockScraper.login).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveSession).toHaveBeenCalledWith(newSession);
  });

  it("should login when no existing session", async () => {
    const newSession: AuthSession = {
      id: "session-new",
      cookies: ["session_id=xyz789"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.none()));
    vi.mocked(mockScraper.login).mockReturnValue(Effect.succeed(newSession));
    vi.mocked(mockStorage.saveSession).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      authenticate(mockScraper, mockStorage)({ forceReauth: false }),
    );

    expect(result).toEqual(newSession);
    expect(mockScraper.login).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveSession).toHaveBeenCalledWith(newSession);
  });

  it("should force reauth when forceReauth is true", async () => {
    const existingSession: AuthSession = {
      id: "session-existing",
      cookies: ["session_id=abc123"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newSession: AuthSession = {
      id: "session-new",
      cookies: ["session_id=xyz789"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(existingSession)));
    vi.mocked(mockScraper.login).mockReturnValue(Effect.succeed(newSession));
    vi.mocked(mockStorage.saveSession).mockReturnValue(Effect.succeed(undefined));

    const result = await Effect.runPromise(
      authenticate(mockScraper, mockStorage)({ forceReauth: true }),
    );

    expect(result).toEqual(newSession);
    expect(mockScraper.isLoggedIn).not.toHaveBeenCalled();
    expect(mockScraper.login).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveSession).toHaveBeenCalledWith(newSession);
  });

  it("should handle storage error when getting session", async () => {
    const storageError: StorageError = {
      _tag: "StorageError",
      type: "DATABASE_ERROR",
      message: "Database connection failed",
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.fail(storageError));

    await expect(
      Effect.runPromise(authenticate(mockScraper, mockStorage)({ forceReauth: false })),
    ).rejects.toThrow();
  });

  it("should handle scraping error when checking login status", async () => {
    const validSession: AuthSession = {
      id: "session-123",
      cookies: ["session_id=abc123"],
      userAgent: "Mozilla/5.0",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scrapingError: ScrapingError = {
      _tag: "ScrapingError",
      type: "NETWORK_ERROR",
      message: "Network timeout",
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.some(validSession)));
    vi.mocked(mockScraper.isLoggedIn).mockReturnValue(Effect.fail(scrapingError));

    await expect(
      Effect.runPromise(authenticate(mockScraper, mockStorage)({ forceReauth: false })),
    ).rejects.toThrow();
  });

  it("should handle login failure", async () => {
    const loginError: ScrapingError = {
      _tag: "ScrapingError",
      type: "AUTH_REQUIRED",
      message: "Login failed",
    };

    vi.mocked(mockStorage.getSession).mockReturnValue(Effect.succeed(Option.none()));
    vi.mocked(mockScraper.login).mockReturnValue(Effect.fail(loginError));

    await expect(
      Effect.runPromise(authenticate(mockScraper, mockStorage)({ forceReauth: false })),
    ).rejects.toThrow();
  });
});
