#!/usr/bin/env node

import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { resolve } from "path";

import { intro, outro, confirm, isCancel, spinner } from "@clack/prompts";
import { Command } from "commander";
import { Effect } from "effect";

import { createNullNullJobService } from "@/application/services/job-hunter-service.js";
import { loadConfig } from "@/infrastructure/adapters/config/config-service.js";
import { createLinkedInScraper } from "@/infrastructure/adapters/linkedin/linkedin-scraper.js";
import { createOpenAIService } from "@/infrastructure/adapters/llm/openai-service.js";
import { createSqliteStorageService } from "@/infrastructure/adapters/storage/sqlite-storage.js";
import { createTelegramService } from "@/infrastructure/adapters/telegram/telegram-service.js";

import { logger } from "./ui/index.js";

// Helper function to format errors in a user-friendly way
const formatError = (error: unknown): string => {
  // Handle Effect FiberFailure errors
  if (error && typeof error === "object") {
    // Check if it's a FiberFailure by looking for the symbol
    const symbolKeys = Object.getOwnPropertySymbols(error);
    const isFiberFailure = symbolKeys.some((key) => key.toString().includes("FiberFailure"));

    if (isFiberFailure) {
      // Try to extract the cause from the symbol
      const causeSymbol = symbolKeys.find((key) => key.toString().includes("Cause"));
      if (causeSymbol) {
        const cause = (error as Record<symbol, unknown>)[causeSymbol];
        if (cause) {
          // Check if it's a Fail object with an error property
          if (cause && typeof cause === "object" && "error" in cause && cause.error !== undefined) {
            return formatError(cause.error);
          }
          // If it's already a ConfigError, process it directly
          if (
            cause &&
            typeof cause === "object" &&
            "_tag" in cause &&
            (cause as { _tag: string })._tag === "ConfigError"
          ) {
            return formatError(cause);
          }
          return formatError(cause);
        }
      }

      // If no cause symbol, try to parse the message
      const errorWithMessage = error as { message?: string };
      if (errorWithMessage.message) {
        try {
          const parsedError = JSON.parse(errorWithMessage.message) as unknown;
          if (parsedError && typeof parsedError === "object" && "_tag" in parsedError) {
            return formatError(parsedError);
          }
        } catch {
          // Not JSON, continue with regular error handling
        }
      }
    }

    // Check for regular cause property
    if ("cause" in error) {
      const fiberFailure = error as { cause?: unknown };
      if (fiberFailure.cause) {
        return formatError(fiberFailure.cause);
      }
    }
  }

  // Handle Effect errors that might be wrapped
  if (error && typeof error === "object" && "_tag" in error) {
    const baseError = error as { _tag: string; type: string; message: string; cause?: unknown };

    switch (baseError._tag) {
      case "Fail": {
        // Handle Effect Fail objects that contain the actual error in the failure property
        const failObject = error as { failure?: unknown };
        if (failObject.failure) {
          return formatError(failObject.failure);
        }
        return `❌ Fail: ${baseError.message || "Unknown failure"}`;
      }
      case "ConfigError":
        switch (baseError.type) {
          case "MISSING_ENV_VAR":
            return `❌ Configuration Error: Missing required environment variable\n   ${baseError.message}\n\n   Please set the required environment variables and try again.`;
          case "FILE_NOT_FOUND":
            return `❌ Configuration Error: Configuration file not found\n   ${baseError.message}\n\n   Please create a config.json file or set the CONFIG_PATH environment variable.`;
          case "INVALID_CONFIG":
            return `❌ Configuration Error: Invalid configuration\n   ${baseError.message}\n\n   Please check your configuration file and try again.`;
          case "PARSE_ERROR":
            // Check if it's actually a missing environment variable error
            if (baseError.message.includes("Missing required environment variable")) {
              return `❌ Configuration Error: Missing required environment variable\n   ${baseError.message}\n\n   Please set the required environment variables and try again.`;
            }
            return `❌ Configuration Error: Failed to parse configuration\n   ${baseError.message}\n\n   Please check your configuration file format and try again.`;
          default:
            return `❌ Configuration Error: ${baseError.message}`;
        }
      case "AuthenticateError":
        switch (baseError.type) {
          case "AUTH_FAILED":
            return `❌ Authentication Failed: ${baseError.message}\n\n   Please check your LinkedIn credentials and try again.`;
          case "SESSION_EXPIRED":
            return `❌ Session Expired: ${baseError.message}\n\n   Please re-authenticate using the --force flag.`;
          case "USER_CANCELLED":
            return `❌ Authentication Cancelled: ${baseError.message}\n\n   Authentication was cancelled by the user.`;
          default:
            return `❌ Authentication Error: ${baseError.message}`;
        }
      case "ScrapingError":
        return `❌ Scraping Error: ${baseError.message}\n\n   There was an issue accessing LinkedIn. Please try again later.`;
      case "LLMError":
        return `❌ AI Service Error: ${baseError.message}\n\n   There was an issue with the AI service. Please check your API key and try again.`;
      case "StorageError":
        return `❌ Storage Error: ${baseError.message}\n\n   There was an issue accessing the database. Please try again.`;
      case "TelegramError":
        return `❌ Notification Error: ${baseError.message}\n\n   There was an issue sending notifications. Please check your Telegram configuration.`;
      default:
        return `❌ ${baseError._tag}: ${baseError.message}`;
    }
  }

  // Handle stringified JSON errors (including in Error messages)
  if (typeof error === "string") {
    try {
      const parsedError = JSON.parse(error) as unknown;
      if (parsedError && typeof parsedError === "object" && "_tag" in parsedError) {
        return formatError(parsedError);
      }
    } catch {
      // Not JSON, continue with string handling
    }
  }

  // Handle Error objects that might contain JSON in their message
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(error.message) as unknown;
      if (parsedError && typeof parsedError === "object" && "_tag" in parsedError) {
        return formatError(parsedError);
      }
    } catch {
      // Not JSON, continue with regular error handling
    }
    return `❌ Error: ${error.message}`;
  }

  return `❌ Unknown Error: ${error instanceof Error ? error.message : String(error)}`;
};

// Singleton instance management
const LOCK_FILE = resolve(process.cwd(), ".agent-null-null-job.lock");
const PID_FILE = resolve(process.cwd(), ".agent-null-null-job.pid");

class InstanceManager {
  private static readonly instance: InstanceManager | undefined;
  private readonly isRunning = false;

  private constructor() {}

  static getInstance(): InstanceManager {
    if (!InstanceManager.instance) {
      Object.defineProperty(InstanceManager, "instance", {
        value: new InstanceManager(),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return InstanceManager.instance as InstanceManager;
  }

  async acquireLock(): Promise<boolean> {
    if (this.isRunning) {
      return false;
    }

    // Check if lock file exists and if the process is still running
    if (existsSync(LOCK_FILE)) {
      try {
        const lockData = JSON.parse(readFileSync(LOCK_FILE, "utf8")) as {
          pid?: number;
          timestamp?: number;
          command?: string;
        };
        const pid = lockData.pid ?? 0;
        if (pid > 0 && this.isProcessRunning(pid)) {
          return false; // Another instance is running
        }
        // Clean up stale lock files
        this.releaseLock();
      } catch {
        // Clean up corrupted lock files
        this.releaseLock();
      }
    }

    try {
      // Create lock file
      writeFileSync(
        LOCK_FILE,
        JSON.stringify({
          pid: process.pid,
          timestamp: Date.now(),
          command: process.argv.slice(2).join(" "),
        }),
      );
      writeFileSync(PID_FILE, process.pid.toString());
      // this.isRunning = true; // State managed by lock file
      return true;
    } catch {
      return false;
    }
  }

  releaseLock(): void {
    try {
      if (existsSync(LOCK_FILE)) {
        unlinkSync(LOCK_FILE);
      }
      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }
    } catch {
      // Ignore cleanup errors
    }
    // this.isRunning = false; // State managed by lock file
  }

  private isProcessRunning(pid: number): boolean {
    try {
      // On Unix-like systems, kill with signal 0 checks if process exists
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  getLockInfo(): {
    readonly pid: number;
    readonly timestamp: number;
    readonly command: string;
  } | null {
    if (!existsSync(LOCK_FILE)) {
      return null;
    }

    try {
      const lockData = JSON.parse(readFileSync(LOCK_FILE, "utf8")) as {
        pid?: number;
        timestamp?: number;
        command?: string;
      };
      return {
        pid: lockData.pid ?? 0,
        timestamp: lockData.timestamp ?? 0,
        command: lockData.command ?? "",
      };
    } catch {
      return null;
    }
  }
}

// Graceful shutdown handlers
const instanceManager = InstanceManager.getInstance();

const cleanup = () => {
  instanceManager.releaseLock();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message ?? String(error)}`);
  cleanup();
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  cleanup();
  process.exit(1);
});

const program = new Command();

program
  .name("0x00004a")
  .description("Agent: NullNullJob - LinkedIn Job Discovery CLI with Clean Architecture")
  .version("1.0.0")
  .option("-c, --criteria <id>", "Criteria ID to use", "default")
  .option("-d, --dry-run", "Run without making changes")
  .option("-f, --force", "Force re-authentication")
  .option("--purge", "Purge all data before running")
  .action(async (options: Record<string, unknown>) => {
    await runAgent({
      criteria: (options["criteria"] as string) ?? "default",
      dryRun: (options["dryRun"] as boolean) ?? false,
      force: (options["force"] as boolean) ?? false,
      purge: (options["purge"] as boolean) ?? false,
    });
  });

// Helper function to check and acquire lock
const checkAndAcquireLock = async (): Promise<boolean> => {
  const acquired = await instanceManager.acquireLock();
  if (!acquired) {
    const lockInfo = instanceManager.getLockInfo();
    if (lockInfo) {
      const runningTime = Math.round((Date.now() - lockInfo.timestamp) / 1000);
      outro(
        `Another instance is already running (PID: ${lockInfo.pid}, running for ${runningTime}s, command: ${lockInfo.command})`,
      );
      outro("Only one instance of Agent: NullNullJob can run at a time.");
      process.exit(20); // Exit code 20 for instance already running
    } else {
      outro("Failed to acquire lock. Another instance may be running.");
      process.exit(20);
    }
  }
  return true;
};

// Main execution function
const runAgent = async (options: {
  criteria: string;
  dryRun: boolean;
  force: boolean;
  purge: boolean;
}) => {
  await checkAndAcquireLock();

  intro(" Agent: NullNullJob ");

  const s = spinner();
  s.start("Loading configuration...");

  const configEffect = loadConfig();
  const config = await Effect.runPromise(configEffect).catch((error: unknown) => {
    s.stop();
    outro(formatError(error));
    instanceManager.releaseLock();
    process.exit(10);
  });

  const criteria = config.criteria.find((c) => c.id === options.criteria);
  if (!criteria) {
    s.stop();
    outro(
      `❌ Configuration Error: Criteria '${options.criteria}' not found\n\n   Please check your configuration file and ensure the criteria ID exists.`,
    );
    instanceManager.releaseLock();
    process.exit(1);
  }

  const scraper = createLinkedInScraper();
  const storage = createSqliteStorageService(config.storage.dataDir, config.storage.encryptionKey);
  const nullNullJob = createNullNullJobService(
    config,
    scraper,
    createOpenAIService(config.llm.apiKey),
    storage,
    createTelegramService(config.telegram.botToken, config.telegram.chatId),
  );

  // Handle purge option
  if (options.purge) {
    s.message("Purging all data...");
    const purgeEffect = nullNullJob.purgeCache("all");
    await Effect.runPromise(purgeEffect).catch((error: unknown) => {
      s.stop();
      outro(formatError(error));
      instanceManager.releaseLock();
      process.exit(1);
    });
  }

  // Authenticate if needed
  s.message("Checking authentication...");
  const authEffect = nullNullJob.authenticate(options.force);
  await Effect.runPromise(authEffect).catch((error: unknown) => {
    s.stop();
    outro(formatError(error));
    instanceManager.releaseLock();
    process.exit(10);
  });

  // Run job discovery
  s.message("Running job discovery...");
  const runEffect = nullNullJob.runJobDiscovery(criteria, options.dryRun);
  await Effect.runPromise(runEffect).then(
    (run) => {
      s.stop();
      outro(
        `Job discovery completed! Found ${run.jobsFound} jobs, processed ${run.jobsProcessed}, scored ${run.jobsScored}`,
      );
    },
    (error: unknown) => {
      s.stop();
      outro(formatError(error));
      instanceManager.releaseLock();
      process.exit(1);
    },
  );
};

program
  .command("purge")
  .description("Purge all data")
  .action(async () => {
    await checkAndAcquireLock();

    intro(" Purge All Data ");

    const confirmed = await confirm({
      message: "Are you sure you want to purge all data?",
    });

    if (isCancel(confirmed) || !confirmed) {
      outro("Operation cancelled.");
      instanceManager.releaseLock();
      process.exit(0);
    }

    const s = spinner();
    s.start("Purging all data...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error: unknown) => {
      s.stop();
      outro(formatError(error));
      instanceManager.releaseLock();
      process.exit(10);
    });

    const scraper = createLinkedInScraper();
    const storage = createSqliteStorageService(
      config.storage.dataDir,
      config.storage.encryptionKey,
    );
    const nullNullJob = createNullNullJobService(
      config,
      scraper,
      createOpenAIService(config.llm.apiKey),
      storage,
      createTelegramService(config.telegram.botToken, config.telegram.chatId),
    );

    const purgeEffect = nullNullJob.purgeCache("all");
    await Effect.runPromise(purgeEffect).then(
      () => {
        s.stop();
        outro("All data purged successfully!");
      },
      (error: unknown) => {
        s.stop();
        outro(formatError(error));
        instanceManager.releaseLock();
        process.exit(1);
      },
    );
  });

// Parse command line arguments
try {
  program.parse();
} catch (error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "commander.unknownCommand"
  ) {
    const errorWithMessage = error as { message?: string };
    outro(
      `❌ Unknown Command: ${errorWithMessage.message ?? "Unknown error"}\n\n   Use --help to see available commands and options.`,
    );
    process.exit(1);
  } else {
    outro(formatError(error));
    process.exit(1);
  }
}
