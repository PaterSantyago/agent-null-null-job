import { readFile } from "fs/promises";
import { join } from "path";

import { Effect } from "effect";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadConfig } from "./config-service.js";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// Mock process.env
const mockEnv = {
  OPENAI_API_KEY: "test-openai-key",
  TELEGRAM_BOT_TOKEN: "test-telegram-token",
  TELEGRAM_CHAT_ID: "test-chat-id",
  ENCRYPTION_KEY: "test-encryption-key",
};

vi.stubGlobal("process", {
  ...process,
  env: mockEnv,
});

describe("loadConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load config from file successfully", async () => {
    const configContent = JSON.stringify({
      linkedin: {
        requestDelay: 2000,
        maxRetries: 5,
      },
      criteria: [
        {
          id: "custom-criteria",
          keywords: ["python", "django"],
          location: "San Francisco",
          remotePolicy: "HYBRID",
          seniority: "MID",
          employmentType: "FULL_TIME",
          enabled: true,
        },
      ],
    });

    vi.mocked(readFile).mockResolvedValue(configContent);

    const result = await Effect.runPromise(loadConfig());

    expect(result.linkedin.requestDelay).toBe(2000);
    expect(result.linkedin.maxRetries).toBe(5);
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0].id).toBe("custom-criteria");
    expect(result.criteria[0].keywords).toEqual(["python", "django"]);
    expect(result.llm.apiKey).toBe("test-openai-key");
    expect(result.telegram.botToken).toBe("test-telegram-token");
    expect(result.telegram.chatId).toBe("test-chat-id");
    expect(result.storage.encryptionKey).toBe("test-encryption-key");
  });

  it("should create default config when file does not exist", async () => {
    const error = new Error("ENOENT: no such file or directory");
    vi.mocked(readFile).mockRejectedValue(error);

    const result = await Effect.runPromise(loadConfig());

    expect(result.linkedin.baseUrl).toBe("https://www.linkedin.com");
    expect(result.linkedin.jobsUrl).toBe("https://www.linkedin.com/jobs/search");
    expect(result.linkedin.loginUrl).toBe("https://www.linkedin.com/login");
    expect(result.linkedin.requestDelay).toBe(1000);
    expect(result.linkedin.maxRetries).toBe(3);
    expect(result.linkedin.timeout).toBe(30000);
    expect(result.llm.provider).toBe("openai");
    expect(result.llm.apiKey).toBe("test-openai-key");
    expect(result.llm.model).toBe("gpt-4o-mini");
    expect(result.llm.maxTokens).toBe(4000);
    expect(result.llm.temperature).toBe(0.1);
    expect(result.telegram.botToken).toBe("test-telegram-token");
    expect(result.telegram.chatId).toBe("test-chat-id");
    expect(result.telegram.enabled).toBe(true);
    expect(result.storage.dataDir).toBe(join(process.cwd(), "data"));
    expect(result.storage.encryptionKey).toBe("test-encryption-key");
    expect(result.scoring.minScore).toBe(60);
    expect(result.scoring.cvPath).toBe(join(process.cwd(), "cv.txt"));
    expect(result.scoring.cvVersion).toBe("1.0");
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0].id).toBe("default");
    expect(result.criteria[0].keywords).toEqual(["typescript", "node.js", "react"]);
    expect(result.criteria[0].location).toBe("Remote");
    expect(result.criteria[0].remotePolicy).toBe("REMOTE");
    expect(result.criteria[0].seniority).toBe("SENIOR");
    expect(result.criteria[0].employmentType).toBe("FULL_TIME");
    expect(result.criteria[0].enabled).toBe(true);
  });

  it("should fail when required environment variables are missing", async () => {
    // Temporarily override the mocked env to remove required variables
    vi.stubGlobal("process", {
      ...process,
      env: {
        // Missing OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
      },
    });

    const configContent = JSON.stringify({});
    vi.mocked(readFile).mockResolvedValue(configContent);

    await expect(Effect.runPromise(loadConfig())).rejects.toThrow();

    // Restore the mocked env
    vi.stubGlobal("process", {
      ...process,
      env: mockEnv,
    });
  });

  it("should fail when config file is invalid JSON", async () => {
    const invalidJson = "{ invalid json }";
    vi.mocked(readFile).mockResolvedValue(invalidJson);

    await expect(Effect.runPromise(loadConfig())).rejects.toThrow();
  });

  it("should merge environment variables with config file", async () => {
    const configContent = JSON.stringify({
      linkedin: {
        requestDelay: 2000,
      },
      llm: {
        model: "gpt-4",
        temperature: 0.2,
      },
      telegram: {
        enabled: false,
      },
    });

    vi.mocked(readFile).mockResolvedValue(configContent);

    const result = await Effect.runPromise(loadConfig());

    // Environment variables should override
    expect(result.llm.apiKey).toBe("test-openai-key");
    expect(result.telegram.botToken).toBe("test-telegram-token");
    expect(result.telegram.chatId).toBe("test-chat-id");
    expect(result.storage.encryptionKey).toBe("test-encryption-key");

    // Config file values should be used
    expect(result.linkedin.requestDelay).toBe(2000);
    expect(result.llm.model).toBe("gpt-4");
    expect(result.llm.temperature).toBe(0.2);
    expect(result.telegram.enabled).toBe(false);

    // Default values should be used for unspecified fields
    expect(result.linkedin.maxRetries).toBe(3);
    expect(result.llm.maxTokens).toBe(4000);
  });

  it("should use custom config path when provided", async () => {
    const customPath = "/custom/path/config.json";
    const configContent = JSON.stringify({
      linkedin: {
        requestDelay: 3000,
      },
    });

    vi.mocked(readFile).mockResolvedValue(configContent);

    const result = await Effect.runPromise(loadConfig(customPath));

    expect(readFile).toHaveBeenCalledWith(customPath, "utf-8");
    expect(result.linkedin.requestDelay).toBe(3000);
  });

  it("should handle file read errors other than ENOENT", async () => {
    const error = new Error("Permission denied");
    vi.mocked(readFile).mockRejectedValue(error);

    await expect(Effect.runPromise(loadConfig())).rejects.toThrow();
  });

  it("should use default encryption key when not provided", async () => {
    // Temporarily override the mocked env to remove ENCRYPTION_KEY
    vi.stubGlobal("process", {
      ...process,
      env: {
        OPENAI_API_KEY: "test-openai-key",
        TELEGRAM_BOT_TOKEN: "test-telegram-token",
        TELEGRAM_CHAT_ID: "test-chat-id",
        // ENCRYPTION_KEY not set
      },
    });

    const configContent = JSON.stringify({});
    vi.mocked(readFile).mockResolvedValue(configContent);

    const result = await Effect.runPromise(loadConfig());

    expect(result.storage.encryptionKey).toBe("default-key-change-in-production");

    // Restore the mocked env
    vi.stubGlobal("process", {
      ...process,
      env: mockEnv,
    });
  });
});
