import { Effect } from "effect";
import TelegramBot from "node-telegram-bot-api";

import type { Job } from "@/domain/entities/job.js";
import type { TelegramService, TelegramError } from "@/domain/ports/telegram-service.js";

export const createTelegramService = (botToken: string, chatId: string): TelegramService => {
  const bot = new TelegramBot(botToken, { polling: false });

  const formatJob = (job: Job): string => {
    const score = job.score ? `⭐ ${job.score}/100` : "No score";
    const remote = job.remotePolicy !== "UNKNOWN" ? ` | ${job.remotePolicy}` : "";
    const seniority = job.seniority !== "UNKNOWN" ? ` | ${job.seniority}` : "";

    return `🎯 *${job.title}*
🏢 ${job.company} | 📍 ${job.location}${remote}${seniority}
${score}

${job.description.length > 200 ? `${job.description.substring(0, 200)}...` : job.description}

🔗 [Apply](${job.applyUrl})
---
`;
  };

  return {
    sendJobDigest: (jobs: readonly Job[], runId: string): Effect.Effect<void, TelegramError> => {
      return Effect.tryPromise({
        try: async () => {
          if (jobs.length === 0) {
            await bot.sendMessage(
              chatId,
              `📊 *Job Hunt Summary - Run ${runId}*\n\nNo new jobs found in the last hour.`,
            );
            return;
          }

          const highScoreJobs = jobs.filter((job) => (job.score ?? 0) >= 70);
          const averageScore = jobs.reduce((sum, job) => sum + (job.score ?? 0), 0) / jobs.length;

          const message =
            `📊 *Job Hunt Summary - Run ${runId}*\n\n` +
            `📈 Found ${jobs.length} jobs (${highScoreJobs.length} high-score)\n` +
            `⭐ Average score: ${averageScore.toFixed(1)}/100\n\n${
              highScoreJobs.length > 0
                ? `🔥 *Top Jobs:*\n\n${highScoreJobs.slice(0, 5).map(formatJob).join("")}`
                : "No high-score jobs found."
            }`;

          await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        },
        catch: (error) =>
          ({
            _tag: "TelegramError",
            type: "API_ERROR",
            message: `Failed to send job digest: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as TelegramError,
      });
    },

    sendJobAlert: (job: Job, score: number): Effect.Effect<void, TelegramError> => {
      return Effect.tryPromise({
        try: async () => {
          const message = `🚨 *High-Score Job Alert!* ${score}/100\n\n${formatJob(job)}`;
          await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        },
        catch: (error) =>
          ({
            _tag: "TelegramError",
            type: "API_ERROR",
            message: `Failed to send job alert: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as TelegramError,
      });
    },

    sendStatusUpdate: (message: string): Effect.Effect<void, TelegramError> => {
      return Effect.tryPromise({
        try: async () => {
          await bot.sendMessage(chatId, `ℹ️ *Status Update*\n\n${message}`, {
            parse_mode: "Markdown",
          });
        },
        catch: (error) =>
          ({
            _tag: "TelegramError",
            type: "API_ERROR",
            message: `Failed to send status update: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as TelegramError,
      });
    },

    sendErrorAlert: (error: string, context?: string): Effect.Effect<void, TelegramError> => {
      return Effect.tryPromise({
        try: async () => {
          const message = `⚠️ *Error Alert*\n\n${error}${
            context ? `\n\n*Context:* ${context}` : ""
          }`;
          await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        },
        catch: (error) =>
          ({
            _tag: "TelegramError",
            type: "API_ERROR",
            message: `Failed to send error alert: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as TelegramError,
      });
    },
  };
};
