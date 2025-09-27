import { describe, it, expect, vi, beforeEach } from "vitest";

import { logger } from "./logger.js";
import { printTable, printSimpleTable } from "./table.js";

// Mock logger
vi.mock("./logger.js", () => ({
  logger: {
    log: vi.fn(),
  },
  isTTY: true,
}));

// Mock process.stdout.columns
const mockColumns = 80;

describe("Table", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process.stdout, "columns", {
      value: mockColumns,
      writable: true,
    });
  });

  describe("setColumns", () => {
    it("should set columns and return new table instance", () => {
      const table = printTable();
      const columns = [
        { key: "name", header: "Name", width: 20 },
        { key: "age", header: "Age", width: 10 },
      ];

      const newTable = table.setColumns(columns);

      expect(newTable).not.toBe(table);
      expect(newTable).toHaveProperty("addRow");
      expect(newTable).toHaveProperty("addRows");
      expect(newTable).toHaveProperty("render");
    });
  });

  describe("addRow", () => {
    it("should add single row and return new table instance", () => {
      const table = printTable();
      const row = { name: "John", age: 30 };

      const newTable = table.addRow(row);

      expect(newTable).not.toBe(table);
      expect(newTable).toHaveProperty("addRow");
      expect(newTable).toHaveProperty("addRows");
      expect(newTable).toHaveProperty("render");
    });
  });

  describe("addRows", () => {
    it("should add multiple rows and return new table instance", () => {
      const table = printTable();
      const rows = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ];

      const newTable = table.addRows(rows);

      expect(newTable).not.toBe(table);
      expect(newTable).toHaveProperty("addRow");
      expect(newTable).toHaveProperty("addRows");
      expect(newTable).toHaveProperty("render");
    });
  });

  describe("render", () => {
    it("should render table with border", () => {
      const table = printTable({ border: true });
      const columns = [
        { key: "name", header: "Name", width: 10 },
        { key: "age", header: "Age", width: 5 },
      ];
      const rows = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ];

      table.setColumns(columns).addRows(rows).render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("┌"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("│"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("└"));
    });

    it("should render table without border", () => {
      const table = printTable({ border: false });
      const columns = [
        { key: "name", header: "Name", width: 10 },
        { key: "age", header: "Age", width: 5 },
      ];
      const rows = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ];

      table.setColumns(columns).addRows(rows).render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Name"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Age"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("John"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Jane"));
    });

    it("should render compact view when table is too wide", () => {
      // Mock narrow terminal
      Object.defineProperty(process.stdout, "columns", {
        value: 20,
        writable: true,
      });

      const table = printTable();
      const columns = [
        { key: "name", header: "Name", width: 50 },
        { key: "age", header: "Age", width: 50 },
      ];
      const rows = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ];

      table.setColumns(columns).addRows(rows).render();

      expect(logger.log).toHaveBeenCalledWith("Data (compact view):");
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Name: John"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Age: 30"));
    });

    it("should handle empty data", () => {
      const table = printTable();
      const columns = [
        { key: "name", header: "Name", width: 10 },
        { key: "age", header: "Age", width: 5 },
      ];

      table.setColumns(columns).render();

      expect(logger.log).toHaveBeenCalledWith("No data to display");
    });

    it("should handle different column alignments", () => {
      const table = printTable({ border: false });
      const columns = [
        { key: "name", header: "Name", width: 10, align: "left" as const },
        { key: "age", header: "Age", width: 5, align: "center" as const },
        { key: "score", header: "Score", width: 8, align: "right" as const },
      ];
      const rows = [{ name: "John", age: 30, score: 95 }];

      table.setColumns(columns).addRows(rows).render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Name"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Age"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Score"));
    });

    it("should handle undefined values in data", () => {
      const table = printTable({ border: false });
      const columns = [
        { key: "name", header: "Name", width: 10 },
        { key: "age", header: "Age", width: 5 },
      ];
      const rows = [
        { name: "John", age: undefined },
        { name: undefined, age: 25 },
      ];

      table.setColumns(columns).addRows(rows).render();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("John"));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("25"));
    });
  });
});

describe("printSimpleTable convenience function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render simple table", () => {
    const data = [
      { name: "John", age: 30 },
      { name: "Jane", age: 25 },
    ];
    const columns = [
      { key: "name", header: "Name", width: 10 },
      { key: "age", header: "Age", width: 5 },
    ];

    printSimpleTable(data, columns);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Name"));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Age"));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("John"));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Jane"));
  });

  it("should handle empty data array", () => {
    const data: readonly Record<string, unknown>[] = [];
    const columns = [{ key: "name", header: "Name", width: 10 }];

    printSimpleTable(data, columns);

    expect(logger.log).toHaveBeenCalledWith("No data to display");
  });
});
