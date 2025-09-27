import { logger, isTTY } from "./logger.js";

export interface TableColumn {
  readonly key: string;
  readonly header: string;
  readonly width?: number;
  readonly align?: "left" | "center" | "right";
}

export interface TableOptions {
  readonly border?: boolean;
  readonly padding?: number;
  readonly maxWidth?: number;
}

class Table {
  private readonly columns: readonly TableColumn[] = [];
  private readonly rows: readonly Record<string, unknown>[] = [];
  private readonly options: TableOptions;

  constructor(options: TableOptions = {}) {
    this.options = {
      border: true,
      padding: 1,
      maxWidth: isTTY ? process.stdout.columns : 80,
      ...options,
    };
  }

  setColumns(cols: readonly TableColumn[]): Table {
    const newTable = new Table(this.options);
    // Create new instance with updated properties
    const newInstance = Object.create(Object.getPrototypeOf(newTable));
    newInstance.columns = [...cols];
    newInstance.rows = [...this.rows];
    newInstance.options = this.options;
    return newInstance;
  }

  addRow(row: Record<string, unknown>): Table {
    const newTable = new Table(this.options);
    const newInstance = Object.create(Object.getPrototypeOf(newTable));
    newInstance.columns = [...this.columns];
    newInstance.rows = [...this.rows, row];
    newInstance.options = this.options;
    return newInstance;
  }

  addRows(rows: readonly Record<string, unknown>[]): Table {
    const newTable = new Table(this.options);
    const newInstance = Object.create(Object.getPrototypeOf(newTable));
    newInstance.columns = [...this.columns];
    newInstance.rows = [...this.rows, ...rows];
    newInstance.options = this.options;
    return newInstance;
  }

  render(): void {
    if (this.rows.length === 0) {
      logger.log("No data to display");
      return;
    }

    const widths = this.calculateWidths();
    const totalWidth =
      widths.reduce((sum, width) => sum + width, 0) +
      (this.columns.length - 1) * (this.options.padding! * 2 + 1);

    if (totalWidth > this.options.maxWidth!) {
      this.renderCompact();
      return;
    }

    if (this.options.border) {
      this.renderWithBorder(widths);
    } else {
      this.renderPlain(widths);
    }
  }

  private calculateWidths(): readonly number[] {
    const initialWidths = this.columns.map((col) => col.width ?? col.header.length);

    return this.rows.reduce((widths, row) => {
      return this.columns.map((col, i) => {
        const rawValue = row[col.key];
        const value = rawValue === null || rawValue === undefined ? "" : 
          typeof rawValue === 'string' ? rawValue : 
          typeof rawValue === 'number' ? rawValue.toString() :
          typeof rawValue === 'boolean' ? rawValue.toString() :
          JSON.stringify(rawValue);
        return Math.max(widths[i], value.length);
      });
    }, initialWidths);
  }

  private renderWithBorder(widths: readonly number[]): void {
    const border = "─".repeat(
      widths.reduce((sum, w) => sum + w + (this.options.padding ?? 1) * 2, 0) +
        this.columns.length -
        1,
    );

    // Top border
    logger.log(`┌${border}┐`);

    // Header
    this.renderRow(
      this.columns.map((col) => col.header),
      widths,
      "│",
      "│",
    );
    logger.log(`├${border}┤`);

    // Rows
    for (const row of this.rows) {
      const values = this.columns.map((col) => {
        const rawValue = row[col.key];
        return rawValue === null || rawValue === undefined ? "" : String(rawValue);
      });
      this.renderRow(values, widths, "│", "│");
    }

    // Bottom border
    logger.log(`└${border}┘`);
  }

  private renderPlain(widths: readonly number[]): void {
    // Header
    this.renderRow(
      this.columns.map((col) => col.header),
      widths,
      "",
      "",
    );
    logger.log("");

    // Rows
    for (const row of this.rows) {
      const values = this.columns.map((col) => {
        const rawValue = row[col.key];
        return rawValue === null || rawValue === undefined ? "" : String(rawValue);
      });
      this.renderRow(values, widths, "", "");
    }
  }

  private renderCompact(): void {
    logger.log("Data (compact view):");
    for (const row of this.rows) {
      const values = this.columns.map((col) => {
        const rawValue = row[col.key];
        const value = rawValue === null || rawValue === undefined ? "" : 
          typeof rawValue === 'string' ? rawValue : 
          typeof rawValue === 'number' ? rawValue.toString() :
          typeof rawValue === 'boolean' ? rawValue.toString() :
          JSON.stringify(rawValue);
        return `${col.header}: ${value}`;
      });
      logger.log(`  ${values.join(", ")}`);
    }
  }

  private renderRow(
    values: readonly string[],
    widths: readonly number[],
    left: string,
    right: string,
  ): void {
    const paddedValues = values.map((value, i) => {
      const width = widths[i];
      const align = this.columns[i].align ?? "left";

      if (align === "center") {
        const padding = width - value.length;
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return " ".repeat(leftPad) + value + " ".repeat(rightPad);
      } else if (align === "right") {
        return value.padStart(width);
      } else {
        return value.padEnd(width);
      }
    });

    const cellContents = paddedValues.map(
      (paddedValue) =>
        " ".repeat(this.options.padding ?? 1) + paddedValue + " ".repeat(this.options.padding ?? 1)
    );

    const separators = Array.from({ length: values.length - 1 }, () => "│");

    const parts = [left, ...cellContents.flatMap((content, i) => 
      i < cellContents.length - 1 ? [content, separators[i]] : [content]
    ), right];

    logger.log(parts.join(""));
  }
}

// Export factory function
export const printTable = (options?: TableOptions): Table => new Table(options);

// Export convenience function for simple tables
export const printSimpleTable = (
  data: readonly Record<string, unknown>[],
  columns: readonly TableColumn[],
  options?: TableOptions,
): void => {
  const table = new Table(options);
  table.setColumns(columns).addRows(data).render();
};
