import { resolve } from "path";

import { execa } from "execa";
import { describe, it, expect } from "vitest";

const cliPath = resolve(process.cwd(), "dist/index.mjs");

describe("CLI Integration Tests", () => {
  it("should show help when no command is provided", async () => {
    const { stdout } = await execa("node", [cliPath, "--help"]);

    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("greet");
    expect(stdout).toContain("user");
    expect(stdout).toContain("browser");
    expect(stdout).toContain("list");
  });

  it("should show version when --version is provided", async () => {
    const { stdout } = await execa("node", [cliPath, "--version"]);

    expect(stdout.trim()).toBe("1.0.0");
  });

  it("should handle unknown command gracefully", async () => {
    const { stderr, exitCode } = await execa("node", [cliPath, "unknown-command"], {
      reject: false,
    });

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("unknown command");
  });

  it("should handle browser command with default options", async () => {
    const { stdout } = await execa(
      "node",
      [cliPath, "browser", "--url", "https://example.com", "--output", "test-screenshot.png"],
      {
        timeout: 30000, // 30 seconds timeout for browser operations
      },
    );

    expect(stdout).toContain("Screenshot saved to: test-screenshot.png");
  }, 30000);

  it("should handle list command", async () => {
    const { stdout } = await execa("node", [cliPath, "list"]);

    expect(stdout).toContain("No users found");
  });
});
