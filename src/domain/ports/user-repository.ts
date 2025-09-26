import type { Effect, Option } from "effect";

import type { User, UserId, Email, UserError } from "@/domain/entities/user.js";

export interface UserRepository {
  readonly findById: (id: UserId) => Effect.Effect<Option.Option<User>>;
  readonly findByEmail: (email: Email) => Effect.Effect<Option.Option<User>>;
  readonly save: (user: User) => Effect.Effect<User, UserError>;
  readonly delete: (id: UserId) => Effect.Effect<void, UserError>;
  readonly findAll: () => Effect.Effect<readonly User[]>;
}
