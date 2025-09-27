import type { JobCriteria } from "@/domain/entities/job.js";
import type { BaseError } from "@/domain/types/common.js";

export interface LinkedInJobHunterConfig {
  readonly linkedin: {
    readonly baseUrl: string;
    readonly jobsUrl: string;
    readonly loginUrl: string;
    readonly requestDelay: number;
    readonly maxRetries: number;
    readonly timeout: number;
  };
  readonly llm: {
    readonly provider: "openai" | "anthropic";
    readonly apiKey: string;
    readonly model: string;
    readonly maxTokens: number;
    readonly temperature: number;
  };
  readonly telegram: {
    readonly botToken: string;
    readonly chatId: string;
    readonly enabled: boolean;
  };
  readonly storage: {
    readonly dataDir: string;
    readonly encryptionKey: string;
  };
  readonly scoring: {
    readonly minScore: number;
    readonly cvPath: string;
    readonly cvVersion: string;
  };
  readonly criteria: readonly JobCriteria[];
}

export type ConfigError = BaseError<"ConfigError"> & {
  readonly type: "INVALID_CONFIG" | "MISSING_ENV_VAR" | "FILE_NOT_FOUND" | "PARSE_ERROR";
};
