import { Effect, Option } from "effect";

import type { User, UserId, UserError } from "@/domain/entities/user.js";
import type { UserRepository } from "@/domain/ports/user-repository.js";
import { createEmail } from "@/domain/value-objects/email.js";

export interface CreateUserRequest {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

export type CreateUserError = {
  readonly _tag: "CreateUserError";
  readonly type: "USER_ALREADY_EXISTS" | "INVALID_EMAIL" | "REPOSITORY_ERROR";
  readonly message: string;
};

export const createUser =
  (userRepository: UserRepository) =>
  (request: CreateUserRequest): Effect.Effect<User, CreateUserError | UserError> => {
    const userId: UserId = { value: request.id };
    const now = new Date();

    return Effect.gen(function* () {
      const email = yield* createEmail(request.email).pipe(
        Effect.mapError(
          (emailError) =>
            ({
              _tag: "CreateUserError",
              type: "INVALID_EMAIL",
              message: emailError.message,
            }) as CreateUserError,
        ),
      );

      const existingUser = yield* userRepository.findByEmail(email);

      if (Option.isSome(existingUser)) {
        yield* Effect.fail({
          _tag: "CreateUserError",
          type: "USER_ALREADY_EXISTS",
          message: `User with email ${request.email} already exists`,
        } as CreateUserError);
      }

      const user: User = {
        id: userId,
        email,
        name: request.name,
        createdAt: now,
        updatedAt: now,
      };

      return yield* userRepository.save(user).pipe(
        Effect.mapError(
          (repoError) =>
            ({
              _tag: "CreateUserError",
              type: "REPOSITORY_ERROR",
              message: repoError.message,
            }) as CreateUserError,
        ),
      );
    });
  };
