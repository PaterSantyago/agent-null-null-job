import type { Effect, Option } from "effect";

export interface User {
  readonly id: UserId;
  readonly email: Email;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserId {
  readonly value: string;
}

export interface Email {
  readonly value: string;
}

export type UserError = {
  readonly _tag: "UserError";
  readonly type: "USER_NOT_FOUND" | "INVALID_EMAIL" | "USER_ALREADY_EXISTS";
  readonly message: string;
};

export type UserResult = Effect.Effect<User, UserError>;
export type UserOption = Option.Option<User>;
