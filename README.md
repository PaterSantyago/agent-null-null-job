# Agent: NullNullJob

A TypeScript CLI that automates LinkedIn job discovery and delivery using Clean Architecture, functional programming principles, and AI-powered job matching.

## 🚀 Features

- **LinkedIn Job Scraping**: Automated job discovery with headful browser authentication
- **AI-Powered Processing**: LLM-based job data extraction and relevance scoring
- **Smart Filtering**: De-duplication, freshness checks, and configurable criteria
- **Telegram Integration**: Automated job alerts and digest notifications
- **Secure Storage**: Encrypted session management and job data persistence
- **Clean Architecture**: Domain, Application, Infrastructure, and Interface layers
- **Functional Programming**: Using Effect for functional programming patterns
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
- OpenAI API key
- Telegram Bot Token and Chat ID
- LinkedIn account

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

#### Agent: NullNullJob Commands

```bash
# Authenticate with LinkedIn
pnpm dev auth

# Run job discovery pipeline
pnpm dev run

# Re-score existing jobs
pnpm dev score

# Send last results via Telegram
pnpm dev send

# Show agent status
pnpm dev status

# Purge cache or all data
pnpm dev purge --type cache
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Optional
OPENAI_API_KEY=your_openai_api_key
ENCRYPTION_KEY=your_encryption_key_for_secure_storage
```

### Configuration File

The `config.json` file allows you to customize job search criteria and behavior:

```json
{
  "criteria": [
    {
      "id": "typescript-remote",
      "keywords": ["typescript", "node.js", "react"],
      "location": "Remote",
      "remotePolicy": "REMOTE",
      "seniority": "SENIOR",
      "employmentType": "FULL_TIME",
      "enabled": true
    }
  ],
  "scoring": {
    "minScore": 60,
    "cvPath": "./cv.txt"
  }
}
```

### CV File

Create a `cv.txt` file with your professional summary for AI-powered job matching.

#### Legacy Commands

```bash
# Interactive greeting
pnpm dev greet

# User management
pnpm dev user

# Browser automation
pnpm dev browser --url https://example.com --output screenshot.png

# List users
pnpm dev list
```

### Production

After building, you can run the CLI directly:

```bash
pnpm exec 0x00004a --help
```

Or install globally:

```bash
pnpm install -g .
0x00004a --help
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
