# 🤝 Contributing to Order Automation System

Cảm ơn bạn quan tâm đến việc đóng góp cho Order Automation System! Dưới đây là hướng dẫn để giúp bạn bắt đầu.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## 🤝 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:

- Age
- Body size
- Disability
- Ethnicity
- Gender identity and expression
- Level of experience
- Nationality
- Personal appearance
- Race
- Religion
- Sexual identity and orientation

### Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git
- Supabase account (for database)
- Telegram Bot (optional, for testing notifications)

### Setup Development Environment

1. **Fork and clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/Order-Automation-System.git
cd Order-Automation-System
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup environment variables**
```bash
cp .env.example artifacts/api-server/.env
cp artifacts/storefront/.env.example artifacts/storefront/.env
```

Fill in the required environment variables in both `.env` files.

4. **Start development servers**
```bash
# Terminal 1 - Backend
cd artifacts/api-server
pnpm run dev

# Terminal 2 - Frontend
cd artifacts/storefront
pnpm run dev
```

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production branch
- `develop` - Development branch (if using)
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `docs/*` - Documentation updates

### Creating a New Branch

```bash
git checkout -b feature/your-feature-name
```

### Making Changes

1. Write your code following the [Coding Standards](#coding-standards)
2. Test your changes locally
3. Update documentation if needed
4. Commit your changes with a clear message

### Commit Message Format

Follow conventional commits format:

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
- `perf`: Performance improvements

Examples:
```
feat(webhook): add retry queue for failed webhooks

- Implement exponential backoff
- Add monitoring for retry status
- Update documentation

Closes #123
```

## 📐 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in tsconfig.json
- Avoid `any` type - use specific types
- Use interfaces for object shapes
- Add JSDoc comments for complex functions

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at end of statements
- Use const by default, let when reassignment is needed
- Avoid nested ternary operators
- Keep functions small and focused

### File Naming

- Use kebab-case for files: `webhook-handler.ts`
- Use PascalCase for React components: `OrderCard.tsx`
- Use camelCase for variables and functions: `processPayment()`
- Use SCREAMING_SNAKE_CASE for constants: `MAX_RETRY_COUNT`

### Component Structure

```typescript
// 1. Imports
import { useEffect, useState } from 'react';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Constants
const MAX_RETRIES = 3;

// 4. Component
export function ComponentName({ prop }: Props) {
  // 5. Hooks
  const [state, setState] = useState();

  // 6. Effects
  useEffect(() => {
    // ...
  }, []);

  // 7. Handlers
  const handleClick = () => {
    // ...
  };

  // 8. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

## 🧪 Testing Guidelines

### Unit Testing

- Write unit tests for business logic
- Use Jest for testing utilities
- Aim for high code coverage

### Integration Testing

- Test API endpoints
- Test webhook processing
- Test database operations

### Manual Testing

- Test user flows end-to-end
- Test on different browsers
- Test error scenarios

### Testing Checklist

Before submitting a PR, ensure:

- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests pass locally
- [ ] Manual testing completed
- [ ] Documentation updated

## 📥 Pull Request Process

### Before Submitting

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md

### Submitting a PR

1. Push your branch to GitHub
2. Create a Pull Request
3. Fill in the PR template
4. Link related issues
5. Request review from maintainers

### PR Title Format

Use the same format as commit messages:
```
feat(webhook): add retry queue for failed webhooks
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123
Related to #456

## Testing
Describe testing performed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
```

### Review Process

1. Maintainer reviews the PR
2. Request changes if needed
3. Approve when ready
4. Merge to main branch

## 🐛 Reporting Issues

### Bug Reports

Use the GitHub issue template for bug reports:

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
Add screenshots if applicable

## Environment
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 90]
- Node version: [e.g. 18.0.0]

## Additional Context
Any other relevant information
```

### Feature Requests

For new features:

```markdown
## Problem Statement
What problem does this solve?

## Proposed Solution
How should this be implemented?

## Alternatives
What alternatives have you considered?

## Additional Context
Any other relevant information
```

## 📚 Resources

- [Project Documentation](README.md)
- [API Documentation](http://localhost:5000/api/docs)
- [Webhook Test Guide](WEBHOOK_TEST_GUIDE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

## ❓ Questions?

If you have questions:

- Open a GitHub issue with the "question" label
- Contact maintainers via email
- Join our Telegram group (if available)

## 🙏 Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project README

---

**Thank you for contributing to Order Automation System!** 🎉