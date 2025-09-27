import type { Effect, Option } from "effect";

// ============================================================================
// Base Error Type
// ============================================================================

export type BaseError<T extends string> = {
  readonly _tag: T;
  readonly type: string;
  readonly message: string;
  readonly cause?: unknown;
};

// ============================================================================
// Common Value Types
// ============================================================================

export type RemotePolicy = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
export type Seniority = "ENTRY" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL" | "UNKNOWN";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN";
export type JobRunStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

// ============================================================================
// Common Interfaces
// ============================================================================

export interface EntityId {
  readonly value: string;
}

export interface Timestamps {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OptionalTimestamps {
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

// ============================================================================
// Common Effect Type Aliases
// ============================================================================

export type EffectResult<T, E> = Effect.Effect<T, E>;
export type EffectOption<T, E> = Effect.Effect<Option.Option<T>, E>;
export type EffectArray<T, E> = Effect.Effect<readonly T[], E>;
export type EffectVoid<E> = Effect.Effect<void, E>;
export type EffectBoolean<E> = Effect.Effect<boolean, E>;

// ============================================================================
// Common Error Types
// ============================================================================

export type DatabaseError = BaseError<"DatabaseError"> & {
  readonly type: "CONNECTION_ERROR" | "QUERY_ERROR" | "TRANSACTION_ERROR" | "UNKNOWN";
};

export type NetworkError = BaseError<"NetworkError"> & {
  readonly type: "TIMEOUT" | "CONNECTION_REFUSED" | "DNS_ERROR" | "UNKNOWN";
};

export type ValidationError = BaseError<"ValidationError"> & {
  readonly type:
    | "SCHEMA_VALIDATION_FAILED"
    | "INVALID_INPUT"
    | "MISSING_REQUIRED_FIELD"
    | "UNKNOWN";
};

export type AuthenticationError = BaseError<"AuthenticationError"> & {
  readonly type: "INVALID_CREDENTIALS" | "TOKEN_EXPIRED" | "PERMISSION_DENIED" | "UNKNOWN";
};

export type RateLimitError = BaseError<"RateLimitError"> & {
  readonly type: "TOO_MANY_REQUESTS" | "QUOTA_EXCEEDED" | "UNKNOWN";
};
