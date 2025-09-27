import { env } from "node:process";
import { isatty } from "node:tty";

// Terminal capabilities
const supportsColor = !env["NO_COLOR"] && (isatty(1) || env["FORCE_COLOR"]);
const isTTY = isatty(1);

// Colors (only if supported)
const colors = {
  reset: supportsColor ? "\x1b[0m" : "",
  bold: supportsColor ? "\x1b[1m" : "",
  dim: supportsColor ? "\x1b[2m" : "",
  red: supportsColor ? "\x1b[31m" : "",
  green: supportsColor ? "\x1b[32m" : "",
  yellow: supportsColor ? "\x1b[33m" : "",
  blue: supportsColor ? "\x1b[34m" : "",
  magenta: supportsColor ? "\x1b[35m" : "",
  cyan: supportsColor ? "\x1b[36m" : "",
  white: supportsColor ? "\x1b[37m" : "",
};

// Symbols
const symbols = {
  bullet: "•",
  check: "✓",
  cross: "✗",
  info: "ℹ",
  warning: "⚠",
  error: "✖",
  success: "✓",
  pending: "○",
  spinner: isTTY ? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] : ["-", "\\", "|", "/"],
};

export interface LoggerOptions {
  readonly quiet?: boolean;
}

class Logger {
  private readonly quiet: boolean;

  constructor(options: LoggerOptions = {}) {
    this.quiet = options.quiet ?? false;
  }

  // Info messages (stdout)
  info(message: string): void {
    if (!this.quiet) {
      console.log(`${colors.blue}${symbols.info}${colors.reset} ${message}`);
    }
  }

  // Success messages (stdout)
  success(message: string): void {
    if (!this.quiet) {
      console.log(`${colors.green}${symbols.success}${colors.reset} ${message}`);
    }
  }

  // Warning messages (stderr)
  warn(message: string): void {
    if (!this.quiet) {
      console.error(`${colors.yellow}${symbols.warning}${colors.reset} ${message}`);
    }
  }

  // Error messages (stderr)
  error(message: string): void {
    console.error(`${colors.red}${symbols.error}${colors.reset} ${message}`);
  }

  // Debug messages (stdout, only if not quiet)
  debug(message: string): void {
    if (!this.quiet) {
      console.log(`${colors.dim}${symbols.bullet}${colors.reset} ${message}`);
    }
  }

  // Plain text (stdout)
  log(message: string): void {
    if (!this.quiet) {
      console.log(message);
    }
  }

  // Heading (stdout)
  heading(message: string): void {
    if (!this.quiet) {
      console.log(`${colors.bold}${colors.cyan}${message}${colors.reset}`);
    }
  }

  // Subheading (stdout)
  subheading(message: string): void {
    if (!this.quiet) {
      console.log(`${colors.bold}${message}${colors.reset}`);
    }
  }

  // Dim text (stdout)
  dim(message: string): void {
    if (!this.quiet) {
      console.log(`${colors.dim}${message}${colors.reset}`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for custom options
export const createLogger = (options: LoggerOptions): Logger => new Logger(options);

// Export symbols and colors for other UI helpers
export { symbols, colors, isTTY, supportsColor };
