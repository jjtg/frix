# Frix

**F**lexible **R**elational **I**nterface e**X**tension

> Type-safe, auto-generated repository pattern for Kysely

[![npm version](https://img.shields.io/npm/v/frix.svg)](https://www.npmjs.com/package/frix)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-98.84%25-brightgreen.svg)](https://github.com/gomadare/frix)

## Background & Motivation

Writing database access code in Node.js/TypeScript often means choosing between:
- **Raw SQL**: Flexible but error-prone, no type safety
- **Heavy ORMs**: Type-safe but complex, performance overhead
- **Query builders**: Good balance but still requires boilerplate

**Frix** brings the Spring Data JPA experience to TypeScript. Define your table types once, and get auto-generated repository methods with full type safety—no code generation step required.

```typescript
// Define once
const userRepo = createRepository(db, 'users');

// Use immediately - methods are auto-generated
const user = await userRepo.findByEmail('alice@example.com');
const activeUsers = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');
const admins = await userRepo.findAllByRoleIn(['ADMIN', 'SUPER_ADMIN']);
```

## Features

- **Auto-generated finder methods** - `findByX`, `findAllByX` derived from method names
- **Comparison operators** - `GreaterThan`, `LessThan`, `In`, `Like`, `IsNull`, etc.
- **Ordering & pagination** - `OrderByXAsc/Desc`, `limit`, `offset`
- **Batch operations** - `createMany`, `updateMany`, `deleteMany` with chunking
- **Query builder escape hatches** - `query()`, `raw()`, `count()`, `exists()`
- **Transaction support** - `withTransaction()` for atomic operations
- **Full TypeScript type safety** - Leverages Kysely's type system
- **Zero code generation** - Works at runtime via Proxy

## Performance

Frix is designed for high performance with minimal overhead:

- **createMany**: ~110,000 ops/sec (10k records)
- **findAllBy**: ~250,000 ops/sec
- **count**: ~4,000,000 ops/sec

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed results and methodology.

## Coverage

Code coverage is enforced at 80% threshold for lines, branches, functions, and statements.

Current coverage: **98.84%** lines, **91.44%** branches, **100%** functions

```bash
# Run tests with coverage
npm run test:coverage

# Run benchmarks
npm run benchmark
```

## Installation

```bash
npm install frix kysely pg
```

## Quick Start

### 1. Define your database types

```typescript
import type { Generated } from 'kysely';

interface UserTable {
  id: Generated<number>;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Generated<Date>;
}

interface Database {
  users: UserTable;
}
```

### 2. Create a database connection

```typescript
import { createDatabase } from 'frix';

const db = createDatabase<Database>({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'myapp',
});
```

### 3. Create a repository

```typescript
import { createRepository } from 'frix';

const userRepo = createRepository(db, 'users');
```

### 4. Use auto-generated methods

```typescript
// Basic CRUD
const user = await userRepo.create({ email: 'alice@example.com', name: 'Alice', status: 'ACTIVE' });
const found = await userRepo.findById(user.id);
await userRepo.update(user.id, { name: 'Alice Smith' });
await userRepo.delete(user.id);

// Derived finders
const byEmail = await userRepo.findByEmail('alice@example.com');
const activeUsers = await userRepo.findAllByStatus('ACTIVE');

// Comparison operators
const recentUsers = await userRepo.findAllByIdGreaterThan(100);
const specificStatuses = await userRepo.findAllByStatusIn(['ACTIVE', 'PENDING']);

// Ordering and pagination
const sorted = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');
const paginated = await userRepo.findAllByStatus('ACTIVE', { limit: 10, offset: 20 });

// Batch operations
const users = await userRepo.createMany([...data], { chunkSize: 1000 });
await userRepo.updateMany({ status: 'INACTIVE' }, { status: 'ACTIVE' });
await userRepo.deleteMany({ status: 'DELETED' });

// Query builder
const count = await userRepo.count({ status: 'ACTIVE' });
const exists = await userRepo.exists({ email: 'test@example.com' });
const custom = await userRepo.query()
  .where('created_at', '>', someDate)
  .orderBy('name', 'asc')
  .execute();
```

## API Reference

### `createDatabase(config)`

Creates a Kysely database instance with PostgreSQL dialect.

```typescript
const db = createDatabase<Database>({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'myapp',
  max: 10, // connection pool size
});
```

### `createRepository(db, tableName, options?)`

Creates a repository with auto-generated methods.

```typescript
const repo = createRepository(db, 'users', {
  idColumn: 'user_id', // default: 'id'
});
```

### Base Methods

| Method | Description |
|--------|-------------|
| `findAll()` | Get all rows |
| `findById(id)` | Get by primary key, returns `null` if not found |
| `create(data)` | Insert and return row |
| `update(id, data)` | Update and return row, returns `null` if not found |
| `delete(id)` | Delete and return boolean |
| `save(data)` | Upsert (insert or update) |

### Return Values

Methods that may not find a result return `null` (not `undefined`):
- `findById()` → `Row | null`
- `findByX()` (single finders) → `Row | null`
- `update()` → `Row | null`

This follows the convention that `null` represents "intentionally absent" while `undefined` represents "not set".

### Batch Methods

| Method | Description |
|--------|-------------|
| `createMany(data[], options?)` | Bulk insert with chunking |
| `updateMany(criteria, data)` | Update matching rows |
| `deleteMany(criteria)` | Delete matching rows |

Options for `createMany`:
- `chunkSize`: Records per batch (default: 1000)
- `skipReturn`: Return count instead of rows (faster)

### Query Builder Methods

| Method | Description |
|--------|-------------|
| `query()` | Get Kysely SelectQueryBuilder |
| `raw(sqlBuilder)` | Execute raw SQL |
| `count(criteria?)` | Count matching rows |
| `exists(criteria?)` | Check if rows exist |

### Derived Finder Pattern

Method names are parsed to generate queries:

```
findBy{Column}                    → WHERE column = ?
findAllBy{Column}                 → WHERE column = ? (returns array)
findBy{Column}And{Column}         → WHERE col1 = ? AND col2 = ?
findBy{Column}GreaterThan         → WHERE column > ?
findBy{Column}LessThanEqual       → WHERE column <= ?
findBy{Column}In                  → WHERE column IN (?)
findBy{Column}Like                → WHERE column LIKE ?
findBy{Column}IsNull              → WHERE column IS NULL
findAllBy{Column}OrderBy{Column}Asc  → ORDER BY column ASC
findAllBy{Column}OrderBy{Column}Desc → ORDER BY column DESC
```

**Column Name Normalization**: CamelCase method names automatically map to snake_case columns:
- `findByUserId` → `WHERE user_id = ?`
- `findByCreatedAt` → `WHERE created_at = ?`

### Transactions

```typescript
import { withTransaction } from 'frix';

await withTransaction(db, async (trx) => {
  const userRepo = createRepository(trx, 'users');
  const postRepo = createRepository(trx, 'posts');

  const user = await userRepo.create({ ... });
  await postRepo.create({ user_id: user.id, ... });
  // Commits on success, rolls back on error
});
```

### Health Check

```typescript
import { checkDatabaseHealth } from 'frix';

const health = await checkDatabaseHealth(db);
console.log(health.healthy); // true/false
console.log(health.latencyMs); // response time
```

## Performance

Frix is designed for high performance:

- **Parallel batch execution** - `createMany` executes chunks in parallel via `Promise.all`
- **Chunked batch operations** - Handles large datasets without memory issues
- **Connection pooling** - Built-in via Kysely/pg
- **Efficient existence checks** - `exists()` uses `LIMIT 1`
- **No ORM overhead** - Direct query building, no entity tracking

### Benchmarks

| Operation | Records | Time |
|-----------|---------|------|
| createMany | 1,000 | < 500ms |
| createMany | 10,000 | < 5s |
| findAllBy | 1,000 | < 100ms |
| updateMany | 1,000 | < 200ms |
| count | 10,000 | < 50ms |

*Benchmarks run on PostgreSQL 15, see `tests/integration` for details.*

### Connection Pool Sizing

When using `createMany` with large datasets, multiple chunks execute in parallel. Ensure your connection pool is sized appropriately:

```typescript
const db = createDatabase<Database>({
  // ...
  max: 20, // Increase for large parallel batch operations
});
```

**Recommendation**: Set `max` to at least `ceil(expectedRecords / chunkSize)` for optimal parallel performance.

## Limitations

- **PostgreSQL only** - MySQL/SQLite support planned
- **Dynamic methods not fully typed** - Use `@ts-expect-error` for complex finders
- **Peer dependency on Kysely** - You manage the Kysely version
- **No relations** - Use `query()` for joins

## Roadmap

- [ ] MySQL and SQLite dialect support
- [ ] Better type inference for dynamic methods
- [ ] Soft delete support (`deletedAt`)
- [ ] Automatic audit fields (`createdAt`, `updatedAt`)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD is required)
4. Implement the feature
5. Ensure all tests pass (`npm test`)
6. Run linting (`npm run check`)
7. Commit with conventional commits (`feat: add amazing feature`)
8. Push and open a Pull Request

### Development Setup

```bash
git clone https://github.com/yourusername/frix.git
cd frix
npm install
npm test
```

### Running Integration Tests

```bash
docker-compose -f docker-compose.test.yml up -d
npm run test:integration
```

## License

MIT

---

**Frix** - Because database access should be simple, type-safe, and fast.
