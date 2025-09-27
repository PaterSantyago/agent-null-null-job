import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { logger } from "./logger.js";
import { runTasks, runTask } from "./tasks.js";

// Mock logger
vi.mock("./logger.js", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
  symbols: {
    success: "✓",
    cross: "✗",
    pending: "○",
    spinner: ["-", "\\", "|", "/"],
  },
  isTTY: true,
}));

// Mock process methods
const mockProcessExit = vi.fn() as any;
const mockProcessStdoutWrite = vi.fn();

describe("TaskRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessExit.mockClear();
    mockProcessStdoutWrite.mockClear();

    // Mock process methods
    vi.spyOn(process, "exit").mockImplementation(mockProcessExit);
    vi.spyOn(process.stdout, "write").mockImplementation(mockProcessStdoutWrite);

    // Mock setInterval and clearInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("add", () => {
    it("should add task to runner", () => {
      const runner = runTasks();
      const taskFn = vi.fn();

      const result = runner.add("Test task", taskFn);

      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty("add");
      expect(result).toHaveProperty("run");
    });
  });

  describe("run - sequential", () => {
    it("should run tasks sequentially", async () => {
      const task1 = vi.fn().mockResolvedValue(undefined);
      const task2 = vi.fn().mockResolvedValue(undefined);

      const runner = runTasks({ concurrent: false });
      runner.add("Task 1", task1);
      runner.add("Task 2", task2);

      await runner.run();

      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
    });

    it("should handle empty task list", async () => {
      const runner = runTasks();
      await expect(runner.run()).resolves.toBeUndefined();
    });

    it("should handle task errors and exit when exitOnError is true", async () => {
      const error = new Error("Task failed");
      const task = vi.fn().mockRejectedValue(error);

      const runner = runTasks({ exitOnError: true });
      runner.add("Failing task", task);

      await runner.run();

      expect(task).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith("Task failed: Task failed");
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle task errors without exiting when exitOnError is false", async () => {
      const error = new Error("Task failed");
      const task = vi.fn().mockRejectedValue(error);

      const runner = runTasks({ exitOnError: false });
      runner.add("Failing task", task);

      await runner.run();

      expect(task).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith("Task failed: Task failed");
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const task = vi.fn().mockRejectedValue("String error");

      const runner = runTasks({ exitOnError: true });
      runner.add("Failing task", task);

      await runner.run();

      expect(task).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith("Task failed: String error");
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("run - concurrent", () => {
    it("should run tasks concurrently", async () => {
      const task1 = vi.fn().mockResolvedValue(undefined);
      const task2 = vi.fn().mockResolvedValue(undefined);

      const runner = runTasks({ concurrent: true });
      runner.add("Task 1", task1);
      runner.add("Task 2", task2);

      await runner.run();

      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
    });

    it("should handle concurrent task errors", async () => {
      const error = new Error("Concurrent task failed");
      const task1 = vi.fn().mockResolvedValue(undefined);
      const task2 = vi.fn().mockRejectedValue(error);

      const runner = runTasks({ concurrent: true, exitOnError: true });
      runner.add("Task 1", task1);
      runner.add("Task 2", task2);

      await runner.run();

      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith("Task failed: Concurrent task failed");
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("spinner behavior", () => {
    it("should handle task execution", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      const runner = runTasks();
      runner.add("Test task", task);

      await runner.run();

      expect(task).toHaveBeenCalled();
    });
  });
});

describe("runTask convenience function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should run single task", async () => {
    const task = vi.fn().mockResolvedValue(undefined);

    await runTask("Single task", task);

    expect(task).toHaveBeenCalled();
  });

  it("should handle single task errors", async () => {
    const error = new Error("Single task failed");
    const task = vi.fn().mockRejectedValue(error);

    // Mock process.exit to not actually exit
    const originalExit = process.exit;
    process.exit = vi.fn() as any;

    try {
      await runTask("Single task", task, { exitOnError: true });
    } catch {
      // Expected to throw due to process.exit
    }

    expect(task).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("Task failed: Single task failed");
    expect(process.exit).toHaveBeenCalledWith(1);

    // Restore original process.exit
    process.exit = originalExit;
  });
});
