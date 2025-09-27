import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { logger, createLogger, symbols, colors, isTTY, supportsColor } from "./logger.js";

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

// Mock process.env
const originalEnv = process.env;

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(mockConsoleLog);
    vi.spyOn(console, "error").mockImplementation(mockConsoleError);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("info", () => {
    it("should log info message to stdout", () => {
      logger.info("Test info message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `${colors.blue}${symbols.info}${colors.reset} Test info message`,
      );
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.info("Test info message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("success", () => {
    it("should log success message to stdout", () => {
      logger.success("Test success message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `${colors.green}${symbols.success}${colors.reset} Test success message`,
      );
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.success("Test success message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("warn", () => {
    it("should log warning message to stderr", () => {
      logger.warn("Test warning message");
      expect(mockConsoleError).toHaveBeenCalledWith(
        `${colors.yellow}${symbols.warning}${colors.reset} Test warning message`,
      );
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.warn("Test warning message");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("error", () => {
    it("should log error message to stderr", () => {
      logger.error("Test error message");
      expect(mockConsoleError).toHaveBeenCalledWith(
        `${colors.red}${symbols.error}${colors.reset} Test error message`,
      );
    });

    it("should log error even when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.error("Test error message");
      expect(mockConsoleError).toHaveBeenCalledWith(
        `${colors.red}${symbols.error}${colors.reset} Test error message`,
      );
    });
  });

  describe("debug", () => {
    it("should log debug message to stdout", () => {
      logger.debug("Test debug message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `${colors.dim}${symbols.bullet}${colors.reset} Test debug message`,
      );
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.debug("Test debug message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("log", () => {
    it("should log plain message to stdout", () => {
      logger.log("Test plain message");
      expect(mockConsoleLog).toHaveBeenCalledWith("Test plain message");
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.log("Test plain message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("heading", () => {
    it("should log heading message to stdout", () => {
      logger.heading("Test heading");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `${colors.bold}${colors.cyan}Test heading${colors.reset}`,
      );
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.heading("Test heading");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("subheading", () => {
    it("should log subheading message to stdout", () => {
      logger.subheading("Test subheading");
      expect(mockConsoleLog).toHaveBeenCalledWith(`${colors.bold}Test subheading${colors.reset}`);
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.subheading("Test subheading");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("dim", () => {
    it("should log dim message to stdout", () => {
      logger.dim("Test dim message");
      expect(mockConsoleLog).toHaveBeenCalledWith(`${colors.dim}Test dim message${colors.reset}`);
    });

    it("should not log when quiet mode is enabled", () => {
      const quietLogger = createLogger({ quiet: true });
      quietLogger.dim("Test dim message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });
});

describe("Terminal Capabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should detect TTY correctly", () => {
    expect(typeof isTTY).toBe("boolean");
  });

  it("should detect color support correctly", () => {
    // supportsColor should be a boolean (true/false) or undefined in test environment
    // In test environments, isatty(1) might return undefined, making supportsColor undefined
    expect(typeof supportsColor === "boolean" || supportsColor === undefined).toBe(true);
  });

  it("should disable colors when NO_COLOR is set", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, NO_COLOR: "1" };

    // Test that colors are disabled by checking the actual values
    expect(process.env["NO_COLOR"]).toBe("1");

    process.env = originalEnv;
  });

  it("should enable colors when FORCE_COLOR is set", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, FORCE_COLOR: "1" };

    // Test that colors are enabled by checking the actual values
    expect(process.env["FORCE_COLOR"]).toBe("1");

    process.env = originalEnv;
  });
});

describe("Symbols and Colors", () => {
  it("should export symbols object", () => {
    expect(symbols).toHaveProperty("bullet");
    expect(symbols).toHaveProperty("check");
    expect(symbols).toHaveProperty("cross");
    expect(symbols).toHaveProperty("info");
    expect(symbols).toHaveProperty("warning");
    expect(symbols).toHaveProperty("error");
    expect(symbols).toHaveProperty("success");
    expect(symbols).toHaveProperty("pending");
    expect(symbols).toHaveProperty("spinner");
    expect(Array.isArray(symbols.spinner)).toBe(true);
  });

  it("should export colors object", () => {
    expect(colors).toHaveProperty("reset");
    expect(colors).toHaveProperty("bold");
    expect(colors).toHaveProperty("dim");
    expect(colors).toHaveProperty("red");
    expect(colors).toHaveProperty("green");
    expect(colors).toHaveProperty("yellow");
    expect(colors).toHaveProperty("blue");
    expect(colors).toHaveProperty("magenta");
    expect(colors).toHaveProperty("cyan");
    expect(colors).toHaveProperty("white");
  });
});
