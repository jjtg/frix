# Frix Example Project

A complete example demonstrating all features of the frix library.

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

## Quick Start

```bash
# 1. Start the database
docker-compose up -d

# 2. Install dependencies and run migrations
npm install
npm run migrate

# 3. Run the demo
npm run demo
```

## Project Structure

```
example/
├── migrations/           # Kysely migrations
│   ├── 001_create_users.ts
│   └── 002_create_posts.ts
├── src/
│   ├── database.ts       # Database connection setup
│   ├── types.ts          # TypeScript types for tables
│   ├── repositories/     # Repository factories
│   │   ├── user-repository.ts
│   │   └── post-repository.ts
│   └── demo.ts           # Main demo script
├── docker-compose.yml    # PostgreSQL setup
├── kysely.config.ts      # Kysely CLI configuration
└── package.json
```

## Features Demonstrated

### 1. Basic CRUD Operations

```typescript
// Create
const user = await userRepo.create({
  email: 'alice@example.com',
  name: 'Alice',
  status: 'ACTIVE',
});

// Read
const found = await userRepo.findById(user.id);
const all = await userRepo.findAll();

// Update
const updated = await userRepo.update(user.id, { name: 'Alice Smith' });

// Delete
const deleted = await userRepo.delete(user.id);

// Save (upsert)
const saved = await userRepo.save({ ...user, name: 'Alice Updated' });
```

### 2. Derived Finders

Auto-generated finder methods based on method naming:

```typescript
// Single result finders
const user = await userRepo.findByEmail('test@example.com');
const user = await userRepo.findByStatus('ACTIVE');

// Multi-result finders
const users = await userRepo.findAllByStatus('ACTIVE');

// Multi-column finders
const user = await userRepo.findByEmailAndStatus('test@example.com', 'ACTIVE');
```

### 3. Comparison Operators

```typescript
// Greater than
const users = await userRepo.findAllByIdGreaterThan(100);

// Less than or equal
const users = await userRepo.findAllByIdLessThanEqual(50);

// IN operator
const users = await userRepo.findAllByStatusIn(['ACTIVE', 'PENDING']);

// LIKE operator
const users = await userRepo.findAllByEmailLike('%@example.com');
```

### 4. Ordering and Pagination

```typescript
// Order by ascending
const users = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');

// Order by descending
const users = await userRepo.findAllByStatusOrderByCreatedAtDesc('ACTIVE');

// Pagination
const users = await userRepo.findAllByStatus('ACTIVE', {
  limit: 10,
  offset: 20,
});
```

### 5. Batch Operations

High-performance operations for large datasets:

```typescript
// Create many (with automatic chunking)
const users = await userRepo.createMany([
  { email: 'user1@test.com', name: 'User 1', status: 'ACTIVE' },
  { email: 'user2@test.com', name: 'User 2', status: 'ACTIVE' },
  // ... thousands of records
], { chunkSize: 500 });

// Create many without returning rows (faster)
const result = await userRepo.createMany(users, { skipReturn: true });
console.log(result.count); // Number of inserted rows

// Update many by criteria
const count = await userRepo.updateMany(
  { status: 'PENDING' },
  { status: 'ACTIVE' }
);

// Delete many by criteria
const count = await userRepo.deleteMany({ status: 'INACTIVE' });
```

### 6. Query Builder Extensions

Escape hatches for complex queries:

```typescript
// Count rows
const total = await userRepo.count();
const active = await userRepo.count({ status: 'ACTIVE' });

// Check existence (efficient with LIMIT 1)
const hasUsers = await userRepo.exists();
const hasActive = await userRepo.exists({ status: 'ACTIVE' });

// Custom query with full Kysely builder
const results = await userRepo.query()
  .where('created_at', '>', someDate)
  .where('status', '=', 'ACTIVE')
  .orderBy('name', 'asc')
  .limit(10)
  .execute();
```

### 7. Transactions

Atomic operations across multiple repositories:

```typescript
import { withTransaction } from 'frix';

await withTransaction(db, async (scope) => {
  const userRepo = scope.getRepository('users');
  const postRepo = scope.getRepository('posts');

  const user = await userRepo.create({ ... });
  await postRepo.create({ user_id: user.id, ... });

  // All operations commit together or rollback on error
});
```

## Database Setup

### Using Docker (Recommended)

```bash
docker-compose up -d
```

This starts PostgreSQL 15 with:
- Host: localhost
- Port: 5432
- User: frix
- Password: frix
- Database: frix_example

### Migrations

Run migrations:
```bash
npm run migrate
```

Rollback:
```bash
npm run migrate:down
```

## Creating Your Own Repositories

### 1. Define Types

```typescript
// src/types.ts
import type { Generated } from 'kysely';

export interface ProductTable {
  id: Generated<number>;
  name: string;
  price: number;
  category: string;
  created_at: Generated<Date>;
}

export interface Database {
  products: ProductTable;
}
```

### 2. Create Repository

```typescript
// src/repositories/product-repository.ts
import type { Kysely } from 'kysely';
import { createRepository } from 'frix';
import type { Database } from '../types.js';

export function createProductRepository(db: Kysely<Database>) {
  return createRepository(db, 'products');
}
```

### 3. Use Repository

```typescript
const productRepo = createProductRepository(db);

// All methods are automatically available:
const product = await productRepo.findById(1);
const cheap = await productRepo.findAllByPriceLessThan(100);
const electronics = await productRepo.findAllByCategoryOrderByPriceAsc('electronics');
```

## Troubleshooting

### Database Connection Failed

Make sure PostgreSQL is running:
```bash
docker-compose ps
```

Check logs:
```bash
docker-compose logs postgres
```

### Migration Errors

Reset database:
```bash
docker-compose down -v
docker-compose up -d
npm run migrate
```

## License

MIT
