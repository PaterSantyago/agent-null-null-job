#!/usr/bin/env node

import { intro, outro, text, confirm, spinner, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { Effect } from "effect";

import { createUserService } from "@/application/services/user-service.js";
import { createInMemoryUserRepository } from "@/infrastructure/adapters/persistence/in-memory-user-repository.js";
import { createPlaywrightBrowserDriver } from "@/infrastructure/adapters/playwright/playwright-browser-driver.js";

const program = new Command();

program.name("your-cli").description("A TypeScript CLI with Clean Architecture").version("1.0.0");

program
  .command("greet")
  .description("Greet the user interactively")
  .action(async () => {
    intro(chalk.bgBlue(" Welcome to Your CLI! "));

    const name = await text({
      message: "What is your name?",
      placeholder: "Enter your name",
    });

    if (isCancel(name)) {
      outro(chalk.red("Operation cancelled."));
      process.exit(0);
    }

    const shouldContinue = await confirm({
      message: `Hello ${name}! Would you like to continue?`,
    });

    if (isCancel(shouldContinue)) {
      outro(chalk.red("Operation cancelled."));
      process.exit(0);
    }

    if (shouldContinue) {
      const s = spinner();
      s.start("Processing...");

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 2000));

      s.stop("Done!");
      outro(chalk.green(`Nice to meet you, ${name}!`));
    } else {
      outro(chalk.yellow("Maybe next time!"));
    }
  });

program
  .command("user")
  .description("User management commands")
  .action(async () => {
    intro(chalk.bgGreen(" User Management "));

    const email = await text({
      message: "Enter user email:",
      placeholder: "user@example.com",
    });

    if (isCancel(email)) {
      outro(chalk.red("Operation cancelled."));
      process.exit(0);
    }

    const name = await text({
      message: "Enter user name:",
      placeholder: "John Doe",
    });

    if (isCancel(name)) {
      outro(chalk.red("Operation cancelled."));
      process.exit(0);
    }

    const s = spinner();
    s.start("Creating user...");

    const userRepository = createInMemoryUserRepository();
    const userService = createUserService(userRepository);

    const createUserEffect = userService.createUser({
      id: `user-${Date.now()}`,
      email,
      name,
    });

    Effect.runPromise(createUserEffect).then(
      (user) => {
        s.stop();
        outro(chalk.green(`User created successfully: ${user.name} (${user.email.value})`));
      },
      (error) => {
        s.stop();
        outro(chalk.red(`Error: ${error.message}`));
      },
    );
  });

program
  .command("browser")
  .description("Open browser and take a screenshot")
  .option("-u, --url <url>", "URL to visit", "https://example.com")
  .option("-o, --output <path>", "Screenshot output path", "screenshot.png")
  .action(async (options) => {
    intro(chalk.bgMagenta(" Browser Automation "));

    const s = spinner();
    s.start("Launching browser...");

    const browserDriver = createPlaywrightBrowserDriver();

    const browserDemoEffect = Effect.gen(function* () {
      const browser = yield* browserDriver.launch();
      s.message("Navigating to page...");

      yield* browser.page.goto(options.url);
      s.message("Taking screenshot...");

      yield* browser.page.screenshot(options.output);
      s.stop();
      outro(chalk.green(`Screenshot saved to: ${options.output}`));

      // Close browser
      yield* browserDriver.close(browser);

      return browser;
    });

    Effect.runPromise(browserDemoEffect).then(
      () => {
        // Success already handled in the effect
      },
      (error) => {
        s.stop();
        outro(chalk.red(`Error: ${error.message}`));
      },
    );
  });

program
  .command("list")
  .description("List all users")
  .action(async () => {
    intro(chalk.bgCyan(" User List "));

    const s = spinner();
    s.start("Loading users...");

    const userRepository = createInMemoryUserRepository();
    const userService = createUserService(userRepository);

    const listUsersEffect = userService.getAllUsers();

    Effect.runPromise(listUsersEffect).then(
      (users) => {
        s.stop();
        if (users.length === 0) {
          outro(chalk.yellow("No users found."));
        } else {
          outro(chalk.green(`Found ${users.length} user(s):`));
          users.forEach((user) => {
            console.log(chalk.blue(`  • ${user.name} (${user.email.value})`));
          });
        }
      },
      (error) => {
        s.stop();
        outro(chalk.red(`Error loading users: ${error.message}`));
      },
    );
  });

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error(chalk.red("Uncaught Exception:"), error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("Unhandled Rejection:"), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
