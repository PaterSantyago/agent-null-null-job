# Your CLI

A TypeScript CLI project with Clean Architecture, functional programming principles, and comprehensive tooling.

## 🚀 Features

- **Clean Architecture**: Domain, Application, Infrastructure, and Interface layers
- **Functional Programming**: Using fp-ts for functional programming patterns
- **TypeScript 5.9**: Latest TypeScript with strict configuration
- **ESM Support**: Native ES modules with proper configuration
- **CLI Interface**: Interactive CLI with commander, clack prompts, and chalk
- **Browser Automation**: Playwright integration for headful browser automation
- **Comprehensive Testing**: Unit tests with Vitest and integration tests
- **Code Quality**: ESLint v9, Prettier, and Husky pre-commit hooks
- **CI/CD**: GitHub Actions workflow with automated testing and coverage

## 📋 Prerequisites

- Node.js v20+
- pnpm v9+ (required - other package managers are not supported)

## 🛠️ Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd your-cli
```

2. Install dependencies:

```bash
pnpm install
```

> **Note:** This project enforces pnpm usage. Other package managers (npm, yarn) are blocked and will show an error if attempted.

3. Build the project:

```bash
pnpm build
```

## 🎯 Usage

### Development

Run the CLI in development mode:

```bash
pnpm dev
```

### Available Commands

#### Interactive Greeting

```bash
pnpm dev greet
```

Interactive command that asks for your name and greets you.

#### User Management

```bash
pnpm dev user
```

Interactive user creation with email validation.

#### Browser Automation

```bash
pnpm dev browser --url https://example.com --output screenshot.png
```

Opens a browser, navigates to a URL, and takes a screenshot.

#### List Users

```bash
pnpm dev list
```

Lists all created users.

### Production

After building, you can run the CLI directly:

```bash
pnpm exec your-cli --help
```

Or install globally:

```bash
pnpm install -g .
your-cli --help
```

## 🏗️ Project Structure

```
src/
├── domain/                 # Domain layer (entities, value objects, ports)
│   ├── entities/          # Business entities
│   ├── value-objects/     # Value objects with validation
│   └── ports/            # Interfaces for external dependencies
├── application/           # Application layer (use cases, services)
│   ├── use-cases/        # Business use cases
│   └── services/         # Application services
├── infrastructure/        # Infrastructure layer (adapters)
│   └── adapters/         # External service adapters
│       ├── fs/           # File system operations
│       ├── http/         # HTTP client
│       ├── persistence/  # Data persistence
│       └── playwright/   # Browser automation
└── interface/            # Interface layer
    └── cli/              # CLI interface
```

## 🧪 Testing

### Unit Tests

```bash
pnpm test
```

### Unit Tests with Coverage

```bash
pnpm test:coverage
```

### Integration Tests

```bash
pnpm test:run
```

### Playwright Tests

```bash
pnpm exec playwright test
```

## 🔧 Development Scripts

- `pnpm dev` - Run CLI in development mode
- `pnpm build` - Build the project
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm fmt` - Format code with Prettier
- `pnpm fmt:check` - Check code formatting
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm test:coverage` - Run tests with coverage
- `pnpm typecheck` - Run TypeScript type checking

## 🎨 Code Quality

This project uses:

- **ESLint v9** with flat config and functional programming rules
- **Prettier** for code formatting
- **Husky** for git hooks
- **lint-staged** for pre-commit linting and formatting
- **TypeScript** with strict configuration

## 🚀 CI/CD

The project includes GitHub Actions workflow that:

- Runs on Node.js 22
- Installs dependencies with pnpm
- Runs linting, type checking, and formatting checks
- Executes unit tests with coverage
- Runs Playwright tests
- Builds the project
- Uploads coverage reports

## 🎭 Browser Automation

The project includes Playwright for browser automation:

- Headful mode by default (visible browser)
- Screenshot capabilities
- Page navigation and interaction
- Cross-browser testing support

Example usage in the CLI:

```bash
pnpm dev browser --url https://example.com --output screenshot.png
```

## 📦 Dependencies

### Runtime Dependencies

- `commander` - CLI framework
- `@clack/prompts` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Spinners
- `fp-ts` - Functional programming utilities
- `io-ts` - Runtime type validation
- `playwright` - Browser automation
- `execa` - Process execution

### Development Dependencies

- `typescript` - TypeScript compiler
- `tsup` - TypeScript bundler
- `tsx` - TypeScript execution
- `vitest` - Testing framework
- `@vitest/coverage-c8` - Coverage reporting
- `eslint` - Linting
- `prettier` - Code formatting
- `husky` - Git hooks
- `lint-staged` - Pre-commit hooks

## 🔧 Configuration Files

- `tsconfig.json` - TypeScript configuration
- `eslint.config.ts` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `vitest.config.ts` - Vitest configuration
- `tsup.config.ts` - Build configuration
- `playwright.config.ts` - Playwright configuration
- `.husky/` - Git hooks
- `.vscode/` - VS Code settings

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📚 Architecture Principles

This project follows Clean Architecture principles:

1. **Domain Layer**: Contains business logic and entities
2. **Application Layer**: Contains use cases and application services
3. **Infrastructure Layer**: Contains external service adapters
4. **Interface Layer**: Contains user interfaces (CLI)

The architecture ensures:

- Testability
- Maintainability
- Separation of concerns
- Dependency inversion
- Functional programming patterns

## 🎯 Functional Programming

The project uses fp-ts for functional programming patterns:

- `Either` for error handling
- `Option` for nullable values
- `pipe` for function composition
- Immutable data structures
- Pure functions where possible

## 🔍 Type Safety

- Strict TypeScript configuration
- Runtime type validation with io-ts
- Comprehensive type definitions
- Path mapping for clean imports
- No implicit any types
