# Contributing to Frix

Thank you for your interest in contributing to Frix! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/yourusername/frix.git
   cd frix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Workflow

### TDD (Test-Driven Development)

**All contributions must follow TDD. This is mandatory.**

1. **Write tests first** - Create failing tests for the feature/fix
2. **Run tests** - Verify they fail
3. **Implement** - Write minimal code to pass tests
4. **Run tests** - Verify they pass
5. **Refactor** - Improve while keeping tests green

### Code Style

- **TypeScript strict mode** - No `any` types
- **Explicit return types** - All functions must declare return types
- **Biome linting** - Run `npm run check` before committing
- **No console.log** - Use proper logging

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Integration tests (requires Docker)
docker-compose -f docker-compose.test.yml up -d
npm run test:integration
```

### Type Checking and Linting

```bash
# Type check
npm run typecheck

# Lint
npm run check

# Auto-fix issues
npm run check:fix
```

### Building

```bash
npm run build
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `test` - Adding tests
- `refactor` - Code refactoring
- `docs` - Documentation
- `chore` - Maintenance

**Examples:**
```bash
git commit -m "feat(repository): add soft delete support"
git commit -m "fix(parser): handle consecutive uppercase letters"
git commit -m "test(repository): add input validation tests"
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Write tests first (TDD requirement)

3. Implement your changes

4. Ensure all checks pass:
   ```bash
   npm run precommit
   ```

5. Push and open a Pull Request

6. Fill out the PR template with:
   - Summary of changes
   - Test plan
   - Any breaking changes

## Code Architecture

```
src/
├── infrastructure/
│   ├── database/     # Database connection, logging, transactions
│   └── repository/   # Repository factory, parser
└── shared/
    └── errors/       # Custom error classes

tests/
├── unit/            # Unit tests (mocked dependencies)
└── integration/     # Integration tests (real database)
```

## Guidelines

### Do

- Follow existing code patterns
- Keep functions small and focused
- Use descriptive variable names
- Add JSDoc for public APIs
- Handle errors explicitly
- Consider performance

### Don't

- Use `any` type
- Leave `console.log` statements
- Skip writing tests
- Ignore TypeScript errors
- Break existing tests

## Release Process

Releases are automated via GitHub Actions.

### How It Works

1. **Update version** in `package.json`
2. **Merge to main** - automatically creates a draft release
3. **Review** the draft release in GitHub
4. **Publish** the release - triggers npm publish

### Required Secrets (Maintainers Only)

- `NPM_TOKEN`: npm access token with publish permissions
  - Generate at https://www.npmjs.com/settings/~/tokens
  - Add to repo: Settings → Secrets → Actions → New repository secret

## Questions?

Open an issue for questions or discussions about potential contributions.
