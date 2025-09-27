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

import { logger, printTable } from "./ui/index.js";

// Singleton instance management
const LOCK_FILE = resolve(process.cwd(), ".agent-null-null-job.lock");
const PID_FILE = resolve(process.cwd(), ".agent-null-null-job.pid");

class InstanceManager {
  private static readonly instance: InstanceManager | undefined;
  private readonly isRunning = false;

  private constructor() {}

  static getInstance(): InstanceManager {
    if (!InstanceManager.instance) {
      (InstanceManager as any).instance = new InstanceManager();
    }
    return InstanceManager.instance!;
  }

  async acquireLock(): Promise<boolean> {
    if (this.isRunning) {
      return false;
    }

    // Check if lock file exists and if the process is still running
    if (existsSync(LOCK_FILE)) {
      try {
        const lockData = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
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
      const lockData = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
      return lockData as {
        readonly pid: number;
        readonly timestamp: number;
        readonly command: string;
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
  logger.error(`Uncaught Exception: ${error.message || error}`);
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
  .version("1.0.0");

// Configure commander to exit with error code for unknown commands
program.exitOverride();

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

// Agent: NullNullJob Commands
program
  .command("auth")
  .description("Authenticate with LinkedIn")
  .option("-f, --force", "Force re-authentication")
  .action(async (options) => {
    await checkAndAcquireLock();

    intro(" LinkedIn Authentication ");

    const s = spinner();
    s.start("Loading configuration...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error) => {
      s.stop();
      outro(`Configuration error: ${error.message}`);
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

    s.message("Authenticating with LinkedIn...");

    const authEffect = nullNullJob.authenticate(options.force);
    await Effect.runPromise(authEffect).then(
      (session) => {
        s.stop();
        outro(`Authentication successful! Session expires at ${session.expiresAt.toISOString()}`);
      },
      (error) => {
        s.stop();
        outro(`Authentication failed: ${error.message}`);
        instanceManager.releaseLock();
        process.exit(10);
      },
    );
  });

program
  .command("run")
  .description("Run job discovery pipeline")
  .option("-c, --criteria <id>", "Criteria ID to use", "default")
  .option("-d, --dry-run", "Run without making changes")
  .action(async (options) => {
    await checkAndAcquireLock();

    intro(" Agent: NullNullJob ");

    const s = spinner();
    s.start("Loading configuration...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error) => {
      s.stop();
      outro(`Configuration error: ${error.message}`);
      instanceManager.releaseLock();
      process.exit(10);
    });

    const criteria = config.criteria.find((c) => c.id === options.criteria);
    if (!criteria) {
      s.stop();
      outro(`Criteria '${options.criteria}' not found`);
      instanceManager.releaseLock();
      process.exit(1);
    }

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

    s.message("Running job discovery...");

    const runEffect = nullNullJob.runJobDiscovery(criteria, options.dryRun);
    await Effect.runPromise(runEffect).then(
      (run) => {
        s.stop();
        outro(
          `Job discovery completed! Found ${run.jobsFound} jobs, processed ${run.jobsProcessed}, scored ${run.jobsScored}`,
        );
      },
      (error) => {
        s.stop();
        outro(`Job discovery failed: ${error.message}`);
        instanceManager.releaseLock();
        process.exit(1);
      },
    );
  });

program
  .command("score")
  .description("Re-score existing jobs")
  .option("-c, --criteria <id>", "Criteria ID to use", "default")
  .action(async (options) => {
    await checkAndAcquireLock();

    intro(" Re-scoring Jobs ");

    const s = spinner();
    s.start("Loading configuration...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error) => {
      s.stop();
      outro(`Configuration error: ${error.message}`);
      instanceManager.releaseLock();
      process.exit(10);
    });

    const criteria = config.criteria.find((c) => c.id === options.criteria);
    if (!criteria) {
      s.stop();
      outro(`Criteria '${options.criteria}' not found`);
      instanceManager.releaseLock();
      process.exit(1);
    }

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

    s.message("Re-scoring jobs...");

    const scoreEffect = nullNullJob.scoreExistingJobs(criteria);
    await Effect.runPromise(scoreEffect).then(
      (jobs) => {
        s.stop();
        const highScoreJobs = jobs.filter((job) => (job.score ?? 0) >= 70);
        outro(`Re-scored ${jobs.length} jobs, ${highScoreJobs.length} high-score jobs`);
      },
      (error) => {
        s.stop();
        outro(`Re-scoring failed: ${error.message}`);
        instanceManager.releaseLock();
        process.exit(1);
      },
    );
  });

program
  .command("send")
  .description("Send last results via Telegram")
  .option("-c, --criteria <id>", "Criteria ID to use", "default")
  .action(async (options) => {
    await checkAndAcquireLock();

    intro(" Sending Results ");

    const s = spinner();
    s.start("Loading configuration...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error) => {
      s.stop();
      outro(`Configuration error: ${error.message}`);
      instanceManager.releaseLock();
      process.exit(10);
    });

    const criteria = config.criteria.find((c) => c.id === options.criteria);
    if (!criteria) {
      s.stop();
      outro(`Criteria '${options.criteria}' not found`);
      instanceManager.releaseLock();
      process.exit(1);
    }

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

    s.message("Sending results...");

    const sendEffect = nullNullJob.sendLastResults(criteria);
    await Effect.runPromise(sendEffect).then(
      () => {
        s.stop();
        outro("Results sent successfully!");
      },
      (error) => {
        s.stop();
        outro(`Failed to send results: ${error.message}`);
        instanceManager.releaseLock();
        process.exit(1);
      },
    );
  });

program
  .command("status")
  .description("Show agent status")
  .action(async () => {
    await checkAndAcquireLock();

    intro(" Agent: NullNullJob Status ");

    const s = spinner();
    s.start("Loading status...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error) => {
      s.stop();
      outro(`Configuration error: ${error.message}`);
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

    const statusEffect = nullNullJob.getStatus();
    await Effect.runPromise(statusEffect).then(
      (status) => {
        s.stop();

        // Display status using table
        const statusData = [
          {
            Property: "Session Status",
            Value: status.sessionValid ? "Valid" : "Invalid",
            Status: status.sessionValid ? "✓" : "✗",
          },
          {
            Property: "Total Jobs",
            Value: status.totalJobs.toString(),
            Status: "",
          },
          {
            Property: "High-Score Jobs",
            Value: status.highScoreJobs.toString(),
            Status: "",
          },
        ];

        const lastRunData = status.lastRun
          ? [
              {
                Property: "Last Run",
                Value: status.lastRun.completedAt?.toISOString() ?? "Running",
                Status: status.lastRun.completedAt ? "✓" : "○",
              },
              {
                Property: "Jobs Found",
                Value: status.lastRun.jobsFound.toString(),
                Status: "",
              },
              {
                Property: "Jobs Processed",
                Value: status.lastRun.jobsProcessed.toString(),
                Status: "",
              },
              {
                Property: "Jobs Scored",
                Value: status.lastRun.jobsScored.toString(),
                Status: "",
              },
            ]
          : [];

        const allStatusData = [...statusData, ...lastRunData];

        printTable()
          .setColumns([
            { key: "Property", header: "Property", width: 20 },
            { key: "Value", header: "Value", width: 30 },
            { key: "Status", header: "Status", width: 8, align: "center" },
          ])
          .addRows(allStatusData)
          .render();

        outro("Agent status loaded successfully!");
      },
      (error) => {
        s.stop();
        outro(`Failed to load status: ${error.message}`);
        instanceManager.releaseLock();
        process.exit(1);
      },
    );
  });

program
  .command("purge")
  .description("Purge cache or all data")
  .option("-t, --type <type>", "Type to purge: cache or all", "cache")
  .action(async (options) => {
    await checkAndAcquireLock();

    intro(" Purge Data ");

    const confirmed = await confirm({
      message: `Are you sure you want to purge ${options.type}?`,
    });

    if (isCancel(confirmed) || !confirmed) {
      outro("Operation cancelled.");
      instanceManager.releaseLock();
      process.exit(0);
    }

    const s = spinner();
    s.start("Purging data...");

    const configEffect = loadConfig();
    const config = await Effect.runPromise(configEffect).catch((error) => {
      s.stop();
      outro(`Configuration error: ${error.message}`);
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

    const purgeEffect = nullNullJob.purgeCache(options.type as "cache" | "all");
    await Effect.runPromise(purgeEffect).then(
      () => {
        s.stop();
        outro(`${options.type} purged successfully!`);
      },
      (error) => {
        s.stop();
        outro(`Failed to purge: ${error.message}`);
        instanceManager.releaseLock();
        process.exit(1);
      },
    );
  });

// Parse command line arguments
try {
  program.parse();
} catch (error: any) {
  if (error.code === "commander.unknownCommand") {
    logger.error(`Unknown command: ${error.message}`);
    process.exit(1);
  } else {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
