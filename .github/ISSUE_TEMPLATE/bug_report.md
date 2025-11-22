---
name: Bug Report
about: Report a bug in Frix
title: ''
labels: bug
assignees: ''
---

## Description

A clear and concise description of what the bug is.

## Reproduction Steps

1. Set up database with '...'
2. Create repository with '...'
3. Call method '...'
4. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Code Example

```typescript
// Minimal code to reproduce the issue
const repo = createRepository(db, 'users');
const result = await repo.findByEmail('test@example.com');
// Error: ...
```

## Error Message

```
Paste the full error message here
```

## Environment

- Node.js version:
- Frix version:
- Kysely version:
- PostgreSQL version:
- OS:

## Additional Context

Add any other context about the problem here.
