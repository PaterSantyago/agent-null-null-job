import { Effect } from "effect";
import { describe, it, expect } from "vitest";

import { createUser } from "@/application/use-cases/create-user.js";
import type { UserRepository } from "@/domain/ports/user-repository.js";
import { createInMemoryUserRepository } from "@/infrastructure/adapters/persistence/in-memory-user-repository.js";

describe("CreateUser Use Case", () => {
  const userRepository: UserRepository = createInMemoryUserRepository();
  const createUserUseCase: ReturnType<typeof createUser> = createUser(userRepository);

  it("should create a user successfully", async () => {
    const request = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
    };

    const result = await Effect.runPromise(createUserUseCase(request));

    expect(result.id.value).toBe("user-1");
    expect(result.email.value).toBe("test@example.com");
    expect(result.name).toBe("Test User");
  });

  it("should reject invalid email", async () => {
    const request = {
      id: "user-1",
      email: "invalid-email",
      name: "Test User",
    };

    const result = await Effect.runPromise(Effect.flip(createUserUseCase(request)));

    expect(result).toHaveProperty("_tag", "CreateUserError");
    expect(result).toHaveProperty("type", "INVALID_EMAIL");
  });

  it("should handle empty email", async () => {
    const request = {
      id: "user-1",
      email: "",
      name: "Test User",
    };

    const result = await Effect.runPromise(Effect.flip(createUserUseCase(request)));

    expect(result).toHaveProperty("_tag", "CreateUserError");
    expect(result).toHaveProperty("type", "INVALID_EMAIL");
  });
});
