import { Effect, Option } from "effect";

import type { AuthSession } from "@/domain/entities/job.js";
import type { LinkedInScraper } from "@/domain/ports/linkedin-scraper.js";
import type { StorageService } from "@/domain/ports/storage-service.js";
import type { BaseError } from "@/domain/types/common.js";

export interface AuthenticateRequest {
  readonly forceReauth?: boolean;
}

export type AuthenticateError = BaseError<"AuthenticateError"> & {
  readonly type:
    | "AUTH_FAILED"
    | "SESSION_EXPIRED"
    | "STORAGE_ERROR"
    | "SCRAPING_ERROR"
    | "USER_CANCELLED";
};

export const authenticate =
  (scraper: LinkedInScraper, storage: StorageService) =>
  (request: AuthenticateRequest): Effect.Effect<AuthSession, AuthenticateError> => {
    return Effect.gen(function* () {
      // Check if we have a valid session and don't need to force reauth
      if (!request.forceReauth) {
        const existingSession = yield* storage.getSession().pipe(
          Effect.mapError(
            (error) =>
              ({
                _tag: "AuthenticateError" as const,
                type: "STORAGE_ERROR" as const,
                message: `Failed to get session: ${error.message}`,
                cause: error,
              }) as AuthenticateError,
          ),
        );
        if (Option.isSome(existingSession)) {
          const session = existingSession.value;

          // Check if session is still valid
          const isLoggedIn = yield* scraper.isLoggedIn(session).pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "AuthenticateError" as const,
                  type: "SCRAPING_ERROR" as const,
                  message: `Failed to check login status: ${error.message}`,
                  cause: error,
                }) as AuthenticateError,
            ),
          );
          if (isLoggedIn) {
            return session;
          }

          // Session expired, delete it
          yield* storage.deleteSession().pipe(
            Effect.mapError(
              (error) =>
                ({
                  _tag: "AuthenticateError" as const,
                  type: "STORAGE_ERROR" as const,
                  message: `Failed to delete session: ${error.message}`,
                  cause: error,
                }) as AuthenticateError,
            ),
          );
        }
      }

      // Need to authenticate
      const session = yield* scraper.login().pipe(
        Effect.mapError(
          (error) =>
            ({
              _tag: "AuthenticateError" as const,
              type: "AUTH_FAILED" as const,
              message: `Authentication failed: ${error.message}`,
              cause: error,
            }) as AuthenticateError,
        ),
      );

      // Save the new session
      yield* storage.saveSession(session).pipe(
        Effect.mapError(
          (error) =>
            ({
              _tag: "AuthenticateError" as const,
              type: "STORAGE_ERROR" as const,
              message: `Failed to save session: ${error.message}`,
              cause: error,
            }) as AuthenticateError,
        ),
      );

      return session;
    });
  };
