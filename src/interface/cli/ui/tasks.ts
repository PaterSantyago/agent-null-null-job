import { logger, symbols, isTTY } from "./logger.js";

// Declare global functions for Node.js environment
declare const setInterval: (callback: () => void, ms: number) => ReturnType<typeof setInterval>;
declare const clearInterval: (id: ReturnType<typeof setInterval>) => void;

export interface Task {
  readonly title: string;
  readonly task: () => Promise<void> | void;
}

export interface TaskOptions {
  readonly concurrent?: boolean;
  readonly exitOnError?: boolean;
}

class TaskRunner {
  private readonly tasks: readonly Task[] = [];
  private readonly options: TaskOptions;

  constructor(options: TaskOptions = {}) {
    this.options = {
      concurrent: false,
      exitOnError: true,
      ...options,
    };
  }

  add(title: string, task: () => Promise<void> | void): TaskRunner {
    this.tasks.push({ title, task });
    return this;
  }

  async run(): Promise<void> {
    if (this.tasks.length === 0) {
      return;
    }

    if (this.options.concurrent) {
      await this.runConcurrent();
    } else {
      await this.runSequential();
    }
  }

  private async runSequential(): Promise<void> {
    for (const task of this.tasks) {
      await this.runTask(task);
    }
  }

  private async runConcurrent(): Promise<void> {
    const promises = this.tasks.map((task) => this.runTask(task));
    await Promise.all(promises);
  }

  private async runTask(task: Task): Promise<void> {
    if (isTTY) {
      await this.runTaskWithSpinner(task);
    } else {
      await this.runTaskPlain(task);
    }
  }

  private async runTaskWithSpinner(task: Task): Promise<void> {
    const spinner = this.createSpinner();
    const intervalId = setInterval(() => {
      const next = spinner.next();
      if (!next.done) {
        process.stdout.write(`\r${next.value} ${task.title}`);
      }
    }, 100);

    try {
      // Run task
      await task.task();

      // Stop spinner and show success
      clearInterval(intervalId);
      process.stdout.write(`\r${symbols.success} ${task.title}\n`);
    } catch (error) {
      // Stop spinner and show error
      clearInterval(intervalId);
      process.stdout.write(`\r${symbols.cross} ${task.title}\n`);

      if (error instanceof Error) {
        logger.error(`Task failed: ${error.message}`);
      } else {
        logger.error(`Task failed: ${String(error)}`);
      }

      if (this.options.exitOnError) {
        process.exit(1);
      }
    }
  }

  private async runTaskPlain(task: Task): Promise<void> {
    try {
      logger.log(`${symbols.pending} ${task.title}`);
      await task.task();
      logger.log(`${symbols.success} ${task.title}`);
    } catch (error) {
      logger.log(`${symbols.cross} ${task.title}`);

      if (error instanceof Error) {
        logger.error(`Task failed: ${error.message}`);
      } else {
        logger.error(`Task failed: ${String(error)}`);
      }

      if (this.options.exitOnError) {
        process.exit(1);
      }
    }
  }

  private *createSpinner() {
    let index = 0;
    while (true) {
      yield symbols.spinner[index % symbols.spinner.length];
      index++;
    }
  }
}

// Export factory function
export const runTasks = (options?: TaskOptions): TaskRunner => new TaskRunner(options);

// Export convenience function for single task
export const runTask = async (
  title: string,
  task: () => Promise<void> | void,
  options?: TaskOptions,
): Promise<void> => {
  const runner = new TaskRunner(options);
  runner.add(title, task);
  await runner.run();
};
