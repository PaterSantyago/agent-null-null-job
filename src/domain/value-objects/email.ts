import { Effect } from "effect";

export type EmailError = {
  readonly _tag: "EmailError";
  readonly type: "INVALID_EMAIL_FORMAT";
  readonly message: string;
};

export interface Email {
  readonly value: string;
}

export const createEmail = (value: string): Effect.Effect<Email, EmailError> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return Effect.fail({
      _tag: "EmailError",
      type: "INVALID_EMAIL_FORMAT",
      message: `Invalid email format: ${value}`,
    } as EmailError);
  }

  return Effect.succeed({ value });
};

export const isValidEmail = (email: Email): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.value);
};
