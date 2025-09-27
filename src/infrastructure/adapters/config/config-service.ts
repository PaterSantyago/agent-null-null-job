import { readFile } from "fs/promises";
import { join } from "path";

import { Effect } from "effect";

import type { LinkedInJobHunterConfig, ConfigError } from "@/domain/entities/config.js";

export const loadConfig = (
  configPath?: string,
): Effect.Effect<LinkedInJobHunterConfig, ConfigError> => {
  return Effect.tryPromise({
    try: async () => {
      const configFile = configPath ?? join(process.cwd(), "config.json");

      try {
        const configContent = await readFile(configFile, "utf-8");
        const config = JSON.parse(configContent);

        // Validate required environment variables
        const requiredEnvVars = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];

        for (const envVar of requiredEnvVars) {
          if (!process.env[envVar as keyof typeof process.env]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
          }
        }

        // Merge with environment variables
        const finalConfig: LinkedInJobHunterConfig = {
          linkedin: {
            baseUrl: "https://www.linkedin.com",
            jobsUrl: "https://www.linkedin.com/jobs/search",
            loginUrl: "https://www.linkedin.com/login",
            requestDelay: 1000,
            maxRetries: 3,
            timeout: 30000,
            ...config.linkedin,
          },
          llm: {
            provider: "openai",
            apiKey: process.env["OPENAI_API_KEY"] ?? "",
            model: "gpt-4o-mini",
            maxTokens: 4000,
            temperature: 0.1,
            ...config.llm,
          },
          telegram: {
            botToken: process.env["TELEGRAM_BOT_TOKEN"] ?? "",
            chatId: process.env["TELEGRAM_CHAT_ID"] ?? "",
            enabled: true,
            ...config.telegram,
          },
          storage: {
            dataDir: join(process.cwd(), "data"),
            encryptionKey: process.env["ENCRYPTION_KEY"] ?? "default-key-change-in-production",
            ...config.storage,
          },
          scoring: {
            minScore: 60,
            cvPath: join(process.cwd(), "cv.txt"),
            cvVersion: "1.0",
            ...config.scoring,
          },
          criteria: config.criteria ?? [
            {
              id: "default",
              keywords: ["typescript", "node.js", "react"],
              location: "Remote",
              remotePolicy: "REMOTE",
              seniority: "SENIOR",
              employmentType: "FULL_TIME",
              enabled: true,
            },
          ],
        };

        return finalConfig;
      } catch (error) {
        if (error instanceof Error && error.message.includes("ENOENT")) {
          // Create default config if file doesn't exist
          return createDefaultConfig();
        }
        throw error;
      }
    },
    catch: (error) =>
      ({
        _tag: "ConfigError",
        type: "PARSE_ERROR",
        message: `Failed to load config: ${error instanceof Error ? error.message : "Unknown error"}`,
        cause: error instanceof Error ? error : undefined,
      }) as ConfigError,
  });
};

const createDefaultConfig = (): LinkedInJobHunterConfig => ({
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
    apiKey: process.env["OPENAI_API_KEY"] ?? "",
    model: "gpt-4o-mini",
    maxTokens: 4000,
    temperature: 0.1,
  },
  telegram: {
    botToken: process.env["TELEGRAM_BOT_TOKEN"] ?? "",
    chatId: process.env["TELEGRAM_CHAT_ID"] ?? "",
    enabled: true,
  },
  storage: {
    dataDir: join(process.cwd(), "data"),
    encryptionKey: process.env["ENCRYPTION_KEY"] ?? "default-key-change-in-production",
  },
  scoring: {
    minScore: 60,
    cvPath: join(process.cwd(), "cv.txt"),
    cvVersion: "1.0",
  },
  criteria: [
    {
      id: "default",
      keywords: ["typescript", "node.js", "react"],
      location: "Remote",
      remotePolicy: "REMOTE",
      seniority: "SENIOR",
      employmentType: "FULL_TIME",
      enabled: true,
    },
  ],
});
