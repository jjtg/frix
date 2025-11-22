import type { Kysely } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, createRepository, withTransaction } from '../../src';

// Test database types
interface BenchmarkTable {
  id: number;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  score: number;
  created_at?: Date;
}

interface TestDB {
  benchmarks: BenchmarkTable;
}

// Benchmark utility
interface BenchmarkResult {
  operation: string;
  records: number;
  durationMs: number;
  opsPerSecond: number;
}

async function benchmark(
  operation: string,
  records: number,
  fn: () => Promise<void>
): Promise<BenchmarkResult> {
  const start = performance.now();
  await fn();
  const durationMs = performance.now() - start;
  const opsPerSecond = Math.round((records / durationMs) * 1000);

  console.info(
    `  ${operation}: ${records} records in ${durationMs.toFixed(2)}ms (${opsPerSecond} ops/sec)`
  );

  return { operation, records, durationMs, opsPerSecond };
}

// Generate test data
function generateUsers(count: number): Array<Omit<BenchmarkTable, 'id' | 'created_at'>> {
  return Array.from({ length: count }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@test.com`,
    status: i % 2 === 0 ? ('ACTIVE' as const) : ('INACTIVE' as const),
    score: Math.floor(Math.random() * 100),
  }));
}

describe('Performance Benchmarks', () => {
  let db: Kysely<TestDB>;

  beforeAll(async () => {
    // Connect to test database
    db = createDatabase<TestDB>({
      host: 'localhost',
      port: 5433,
      user: 'test_user',
      password: 'test_password',
      database: 'frix_test',
    });

    // Create test table
    await db.schema
      .createTable('benchmarks')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('email', 'varchar(255)', (col) => col.notNull())
      .addColumn('status', 'varchar(20)', (col) => col.notNull())
      .addColumn('score', 'integer', (col) => col.notNull())
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(db.fn('now')))
      .execute();

    // Create index for status queries
    await db.schema
      .createIndex('benchmarks_status_idx')
      .ifNotExists()
      .on('benchmarks')
      .column('status')
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable('benchmarks').ifExists().execute();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean table before each test
    await db.deleteFrom('benchmarks').execute();
  });

  describe('createMany', () => {
    it('should insert 1000 records in < 500ms', async () => {
      const repo = createRepository(db, 'benchmarks');
      const data = generateUsers(1000);

      const result = await benchmark('createMany (1k)', 1000, async () => {
        await repo.createMany(data);
      });

      expect(result.durationMs).toBeLessThan(500);
    });

    it('should insert 10000 records with chunking in < 5s', async () => {
      const repo = createRepository(db, 'benchmarks');
      const data = generateUsers(10000);

      const result = await benchmark('createMany (10k)', 10000, async () => {
        await repo.createMany(data, { chunkSize: 1000 });
      });

      expect(result.durationMs).toBeLessThan(5000);
    });

    it('should insert 1000 records with skipReturn faster than with return', async () => {
      const repo = createRepository(db, 'benchmarks');
      const data = generateUsers(1000);

      // With return
      const withReturn = await benchmark('createMany with return', 1000, async () => {
        await repo.createMany(data);
      });

      await db.deleteFrom('benchmarks').execute();

      // Without return (skipReturn)
      const withoutReturn = await benchmark('createMany skipReturn', 1000, async () => {
        await repo.createMany(data, { skipReturn: true });
      });

      // skipReturn should be faster (or at least not slower)
      expect(withoutReturn.durationMs).toBeLessThanOrEqual(withReturn.durationMs * 1.2);
    });

    it('should benefit from parallel execution with multiple small chunks', async () => {
      const repo = createRepository(db, 'benchmarks');
      const data = generateUsers(5000);

      // Use small chunk size to create many parallel requests
      const result = await benchmark('createMany parallel (5k, chunk=500)', 5000, async () => {
        await repo.createMany(data, { chunkSize: 500, skipReturn: true });
      });

      // With 10 parallel chunks, should complete reasonably fast
      // Sequential would be ~10x slower
      expect(result.durationMs).toBeLessThan(3000);
    });
  });

  describe('findAllBy', () => {
    it('should query 1000 records in < 100ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup: insert 1000 ACTIVE records
      const data = generateUsers(1000).map((u) => ({ ...u, status: 'ACTIVE' as const }));
      await repo.createMany(data);

      const result = await benchmark('findAllByStatus', 1000, async () => {
        const users = await repo.findAllByStatus('ACTIVE');
        expect(users.length).toBe(1000);
      });

      expect(result.durationMs).toBeLessThan(100);
    });

    it('should query with ordering in < 150ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup
      const data = generateUsers(1000).map((u) => ({ ...u, status: 'ACTIVE' as const }));
      await repo.createMany(data);

      const result = await benchmark('findAllByStatusOrderByNameAsc', 1000, async () => {
        // @ts-expect-error - dynamic method
        const users = await repo.findAllByStatusOrderByNameAsc('ACTIVE');
        expect(users.length).toBe(1000);
      });

      expect(result.durationMs).toBeLessThan(150);
    });
  });

  describe('updateMany', () => {
    it('should update 1000 records in < 200ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup
      const data = generateUsers(1000).map((u) => ({ ...u, status: 'INACTIVE' as const }));
      await repo.createMany(data);

      const result = await benchmark('updateMany', 1000, async () => {
        const count = await repo.updateMany({ status: 'INACTIVE' }, { status: 'ACTIVE' });
        expect(count).toBe(1000);
      });

      expect(result.durationMs).toBeLessThan(200);
    });
  });

  describe('deleteMany', () => {
    it('should delete 1000 records in < 200ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup
      const data = generateUsers(1000).map((u) => ({ ...u, status: 'INACTIVE' as const }));
      await repo.createMany(data);

      const result = await benchmark('deleteMany', 1000, async () => {
        const count = await repo.deleteMany({ status: 'INACTIVE' });
        expect(count).toBe(1000);
      });

      expect(result.durationMs).toBeLessThan(200);
    });
  });

  describe('count and exists', () => {
    it('should count 10000 records in < 50ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup
      const data = generateUsers(10000);
      await repo.createMany(data, { skipReturn: true });

      const result = await benchmark('count', 10000, async () => {
        const count = await repo.count();
        expect(count).toBe(10000);
      });

      expect(result.durationMs).toBeLessThan(50);
    });

    it('should check existence in < 10ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup
      const data = generateUsers(10000);
      await repo.createMany(data, { skipReturn: true });

      const result = await benchmark('exists', 1, async () => {
        const exists = await repo.exists({ status: 'ACTIVE' });
        expect(exists).toBe(true);
      });

      expect(result.durationMs).toBeLessThan(10);
    });
  });

  describe('transactions', () => {
    it('should handle 100 operations in transaction in < 1s', async () => {
      const result = await benchmark('transaction (100 ops)', 100, async () => {
        await withTransaction(db, async (scope) => {
          const repo = scope.getRepository('benchmarks');

          // 100 individual inserts in transaction
          for (let i = 0; i < 100; i++) {
            await repo.create({
              name: `TrxUser ${i}`,
              email: `trx${i}@test.com`,
              status: 'ACTIVE',
              score: i,
            });
          }
        });
      });

      expect(result.durationMs).toBeLessThan(1000);

      // Verify all inserted
      const repo = createRepository(db, 'benchmarks');
      const count = await repo.count();
      expect(count).toBe(100);
    });

    it('should rollback on error without performance penalty', async () => {
      const repo = createRepository(db, 'benchmarks');

      const start = performance.now();

      try {
        await withTransaction(db, async (scope) => {
          const trxRepo = scope.getRepository('benchmarks');

          // Insert some records
          await trxRepo.createMany(generateUsers(50));

          // Force error
          throw new Error('Intentional rollback');
        });
      } catch {
        // Expected
      }

      const duration = performance.now() - start;
      console.info(`  transaction rollback: ${duration.toFixed(2)}ms`);

      // Verify rollback
      const count = await repo.count();
      expect(count).toBe(0);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('query builder', () => {
    it('should execute complex query in < 100ms', async () => {
      const repo = createRepository(db, 'benchmarks');

      // Setup
      const data = generateUsers(5000);
      await repo.createMany(data, { skipReturn: true });

      const result = await benchmark('complex query', 1, async () => {
        const results = await repo
          .query()
          .where('status', '=', 'ACTIVE')
          .where('score', '>', 50)
          .orderBy('name', 'asc')
          .limit(100)
          .execute();

        expect(results.length).toBeLessThanOrEqual(100);
      });

      expect(result.durationMs).toBeLessThan(100);
    });
  });
});
