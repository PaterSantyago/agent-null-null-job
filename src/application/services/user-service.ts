import type { Effect, Option } from "effect";

import {
  createUser,
  type CreateUserRequest,
  type CreateUserError,
} from "@/application/use-cases/create-user.js";
import type { User, UserId, UserError } from "@/domain/entities/user.js";
import type { UserRepository } from "@/domain/ports/user-repository.js";

export interface UserService {
  readonly createUser: (
    request: CreateUserRequest,
  ) => Effect.Effect<User, CreateUserError | UserError>;
  readonly getUserById: (id: UserId) => Effect.Effect<Option.Option<User>>;
  readonly getAllUsers: () => Effect.Effect<readonly User[]>;
}

export const createUserService = (userRepository: UserRepository): UserService => ({
  createUser: createUser(userRepository),

  getUserById: (id: UserId) => userRepository.findById(id),

  getAllUsers: () => userRepository.findAll(),
});
