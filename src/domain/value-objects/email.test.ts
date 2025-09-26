import { Effect } from "effect";
import { describe, it, expect } from "vitest";

import { createEmail, isValidEmail } from "@/domain/value-objects/email.js";

describe("Email Value Object", () => {
  describe("createEmail", () => {
    it("should create a valid email", async () => {
      const result = await Effect.runPromise(createEmail("test@example.com"));

      expect(result.value).toBe("test@example.com");
    });

    it("should reject invalid email format", async () => {
      const result = await Effect.runPromise(Effect.flip(createEmail("invalid-email")));

      expect(result._tag).toBe("EmailError");
      expect(result.type).toBe("INVALID_EMAIL_FORMAT");
      expect(result.message).toContain("Invalid email format");
    });

    it("should reject empty email", async () => {
      const result = await Effect.runPromise(Effect.flip(createEmail("")));

      expect(result._tag).toBe("EmailError");
      expect(result.type).toBe("INVALID_EMAIL_FORMAT");
    });

    it("should reject email without @ symbol", async () => {
      const result = await Effect.runPromise(Effect.flip(createEmail("testexample.com")));

      expect(result._tag).toBe("EmailError");
      expect(result.type).toBe("INVALID_EMAIL_FORMAT");
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid email", () => {
      const email = { value: "test@example.com" };
      expect(isValidEmail(email)).toBe(true);
    });

    it("should return false for invalid email", () => {
      const email = { value: "invalid-email" };
      expect(isValidEmail(email)).toBe(false);
    });
  });
});
