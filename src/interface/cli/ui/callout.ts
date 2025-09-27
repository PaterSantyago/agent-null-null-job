import { logger, colors, symbols } from "./logger.js";

export type CalloutType = "info" | "success" | "warning" | "error";

export interface CalloutOptions {
  readonly title?: string;
  readonly type?: CalloutType;
  readonly border?: boolean;
}

class Callout {
  private readonly message: string;
  private readonly options: CalloutOptions;

  constructor(message: string, options: CalloutOptions = {}) {
    this.message = message;
    this.options = {
      type: "info",
      border: true,
      ...options,
    };
  }

  render(): void {
    const { type, title, border } = this.options;

    const typeConfig = this.getTypeConfig(type ?? "info");
    const icon = typeConfig.icon;
    const color = typeConfig.color;

    if (border) {
      this.renderWithBorder(icon, color, title);
    } else {
      this.renderPlain(icon, color, title);
    }
  }

  private getTypeConfig(type: CalloutType): { readonly icon: string; readonly color: string } {
    switch (type) {
      case "success":
        return {
          icon: symbols.success,
          color: colors.green,
        };
      case "warning":
        return {
          icon: symbols.warning,
          color: colors.yellow,
        };
      case "error":
        return {
          icon: symbols.error,
          color: colors.red,
        };
      case "info":
      default:
        return {
          icon: symbols.info,
          color: colors.blue,
        };
    }
  }

  private renderWithBorder(icon: string, color: string, title?: string): void {
    const lines = this.message.split("\n");
    const maxWidth = Math.max(...lines.map((line) => line.length), title ? title.length + 4 : 0);

    const border = "─".repeat(maxWidth + 2);
    const topBorder = `┌${border}┐`;
    const bottomBorder = `└${border}┘`;

    logger.log(topBorder);

    if (title) {
      const titleLine = `│ ${color}${icon}${colors.reset} ${title}${" ".repeat(maxWidth - title.length - 3)} │`;
      logger.log(titleLine);
      logger.log(`├${border}┤`);
    }

    for (const line of lines) {
      const paddedLine = line.padEnd(maxWidth);
      logger.log(`│ ${paddedLine} │`);
    }

    logger.log(bottomBorder);
  }

  private renderPlain(icon: string, color: string, title?: string): void {
    if (title) {
      logger.log(`${color}${icon}${colors.reset} ${title}: ${this.message}`);
    } else {
      logger.log(`${color}${icon}${colors.reset} ${this.message}`);
    }
  }
}

// Export factory function
export const callout = (message: string, options?: CalloutOptions): Callout =>
  new Callout(message, options);

// Export convenience functions
export const info = (message: string, title?: string): void =>
  callout(message, { type: "info", title }).render();

export const success = (message: string, title?: string): void =>
  callout(message, { type: "success", title }).render();

export const warning = (message: string, title?: string): void =>
  callout(message, { type: "warning", title }).render();

export const error = (message: string, title?: string): void =>
  callout(message, { type: "error", title }).render();
