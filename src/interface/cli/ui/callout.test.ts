import { describe, it, expect, vi, beforeEach } from "vitest";

import { callout, info, success, warning, error } from "./callout.js";
import { logger } from "./logger.js";

// Mock logger
vi.mock("./logger.js", () => ({
  logger: {
    log: vi.fn(),
  },
  symbols: {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✖",
  },
  colors: {
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    reset: "\x1b[0m",
  },
}));

describe("Callout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("callout factory function", () => {
    it("should create callout with default options", () => {
      const calloutInstance = callout("Test message");

      expect(calloutInstance).toHaveProperty("render");
    });

    it("should create callout with custom options", () => {
      const calloutInstance = callout("Test message", {
        title: "Test Title",
        type: "success",
        border: false,
      });

      expect(calloutInstance).toHaveProperty("render");
    });
  });

  describe("render with border", () => {
    it("should render info callout with border", () => {
      const calloutInstance = callout("Test info message", {
        type: "info",
        title: "Info Title",
        border: true,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Info Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test info message"));
    });

    it("should render success callout with border", () => {
      const calloutInstance = callout("Test success message", {
        type: "success",
        title: "Success Title",
        border: true,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("✓"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Success Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test success message"));
    });

    it("should render warning callout with border", () => {
      const calloutInstance = callout("Test warning message", {
        type: "warning",
        title: "Warning Title",
        border: true,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("⚠"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Warning Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test warning message"));
    });

    it("should render error callout with border", () => {
      const calloutInstance = callout("Test error message", {
        type: "error",
        title: "Error Title",
        border: true,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("✖"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Error Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
    });

    it("should render callout without title", () => {
      const calloutInstance = callout("Test message without title", {
        type: "info",
        border: true,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Test message without title"),
      );
    });

    it("should handle multiline messages", () => {
      const multilineMessage = "Line 1\nLine 2\nLine 3";
      const calloutInstance = callout(multilineMessage, {
        type: "info",
        border: true,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Line 1"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Line 2"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Line 3"));
    });
  });

  describe("render without border", () => {
    it("should render info callout without border", () => {
      const calloutInstance = callout("Test info message", {
        type: "info",
        title: "Info Title",
        border: false,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("ℹ"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Info Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test info message"));
    });

    it("should render callout without title and border", () => {
      const calloutInstance = callout("Test message", {
        type: "success",
        border: false,
      });

      calloutInstance.render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("✓"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test message"));
    });
  });
});

describe("Convenience functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("info", () => {
    it("should render info callout", () => {
      info("Test info message");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test info message"));
    });

    it("should render info callout with title", () => {
      info("Test info message", "Info Title");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("ℹ"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Info Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test info message"));
    });
  });

  describe("success", () => {
    it("should render success callout", () => {
      success("Test success message");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test success message"));
    });

    it("should render success callout with title", () => {
      success("Test success message", "Success Title");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("✓"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Success Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test success message"));
    });
  });

  describe("warning", () => {
    it("should render warning callout", () => {
      warning("Test warning message");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test warning message"));
    });

    it("should render warning callout with title", () => {
      warning("Test warning message", "Warning Title");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("⚠"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Warning Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test warning message"));
    });
  });

  describe("error", () => {
    it("should render error callout", () => {
      error("Test error message");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
    });

    it("should render error callout with title", () => {
      error("Test error message", "Error Title");

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("✖"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Error Title"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
    });
  });
});
