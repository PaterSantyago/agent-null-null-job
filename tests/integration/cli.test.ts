import { resolve } from "path";

import { execa } from "execa";
import { describe, it, expect } from "vitest";

const cliPath = resolve(process.cwd(), "dist/index.mjs");

describe("Agent: NullNullJob CLI Integration Tests", () => {
  it("should show help when no command is provided", async () => {
    const { stdout } = await execa("node", [cliPath, "--help"]);

    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("auth");
    expect(stdout).toContain("run");
    expect(stdout).toContain("score");
    expect(stdout).toContain("send");
    expect(stdout).toContain("status");
    expect(stdout).toContain("purge");
  });

  it("should show version when --version is provided", async () => {
    const { stdout } = await execa("node", [cliPath, "--version"]);

    expect(stdout.trim()).toBe("1.0.0");
  });

  it("should handle unknown command gracefully", async () => {
    const { stderr, exitCode } = await execa("node", [cliPath, "unknown-command"], {
      reject: false,
    });

    expect(exitCode).toBe(0);
    expect(stderr).toContain("unknown command");
  });

  it("should show agent name in help", async () => {
    const { stdout } = await execa("node", [cliPath, "--help"]);

    expect(stdout).toContain("Agent: NullNullJob");
    expect(stdout).toContain("0x00004a");
  });
});
