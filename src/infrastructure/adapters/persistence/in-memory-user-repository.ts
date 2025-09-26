import { Effect, Option } from "effect";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type User, type UserId, type Email, UserError } from "@/domain/entities/user.js";
import type { UserRepository } from "@/domain/ports/user-repository.js";

export const createInMemoryUserRepository = (): UserRepository => {
  const users = new Map<string, User>();

  return {
    findById: (id: UserId): Effect.Effect<Option.Option<User>> => {
      const user = users.get(id.value);
      return Effect.succeed(user ? Option.some(user) : Option.none());
    },

    findByEmail: (email: Email): Effect.Effect<Option.Option<User>> => {
      const user = Array.from(users.values()).find((u) => u.email.value === email.value);
      return Effect.succeed(user ? Option.some(user) : Option.none());
    },

    save: (user: User): Effect.Effect<User, UserError> => {
      try {
        users.set(user.id.value, user);
        return Effect.succeed(user);
      } catch (error) {
        const err = error as Error;
        return Effect.fail({
          _tag: "UserError",
          type: "USER_ALREADY_EXISTS",
          message: `Failed to save user: ${err.message}`,
        } as UserError);
      }
    },

    delete: (id: UserId): Effect.Effect<void, UserError> => {
      try {
        const deleted = users.delete(id.value);
        if (!deleted) {
          return Effect.fail({
            _tag: "UserError",
            type: "USER_NOT_FOUND",
            message: `User with id ${id.value} not found`,
          } as UserError);
        }
        return Effect.succeed(undefined);
      } catch (error) {
        const err = error as Error;
        return Effect.fail({
          _tag: "UserError",
          type: "USER_NOT_FOUND",
          message: `Failed to delete user: ${err.message}`,
        } as UserError);
      }
    },

    findAll: (): Effect.Effect<readonly User[]> => {
      return Effect.succeed(Array.from(users.values()));
    },
  };
};
