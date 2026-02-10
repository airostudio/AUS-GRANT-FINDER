# Contributing to AusGrant-Automate

Thank you for your interest in contributing to AusGrant-Automate! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/your-org/ausgrant-automate/issues)
2. If not, create a new issue using the Bug Report template
3. Include detailed steps to reproduce the bug
4. Provide screenshots or error messages if applicable

### Suggesting Features

1. Check if the feature has already been requested
2. Create a new issue using the Feature Request template
3. Clearly describe the feature and its use case
4. Explain why this feature would be valuable

### Pull Requests

1. Fork the repository
2. Create a new branch from `develop`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Write or update tests as needed
5. Ensure all tests pass
   ```bash
   pnpm test
   ```
6. Run the linter and fix any issues
   ```bash
   pnpm lint
   ```
7. Commit your changes with clear commit messages
8. Push to your fork
9. Open a Pull Request to the `develop` branch

## Development Setup

See the [Getting Started](./README.md#getting-started) section in the README.

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer functional programming patterns

### Python

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for all functions and classes
- Use async/await for I/O operations

### Git Commits

Follow conventional commit format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(ai-engine): add confidence scoring for responses
fix(scraper): handle timeout errors in grant parser
docs(readme): update installation instructions
```

## Project Structure

- `apps/web` - Next.js frontend
- `apps/scraper` - Python scraper and API
- `packages/ai-engine` - AI writing engine with RAG
- `packages/form-filler` - Browser automation
- `packages/database` - Database schema and client

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @ausgrant/ai-engine test
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration
```

### Python Tests

```bash
cd apps/scraper
poetry run pytest
```

## Documentation

- Update README.md if you change functionality
- Update package README files for package-specific changes
- Add JSDoc comments for new functions
- Update the Writer Persona guide if changing AI behavior

## Review Process

1. All PRs require at least one approval
2. CI/CD checks must pass
3. Code must be formatted and linted
4. Tests must pass
5. Documentation must be updated

## Questions?

If you have questions:
- Open a [Discussion](https://github.com/your-org/ausgrant-automate/discussions)
- Ask in the PR comments
- Check existing Issues and Discussions

Thank you for contributing to AusGrant-Automate!
