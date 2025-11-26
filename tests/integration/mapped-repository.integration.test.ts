import type { Generated, Kysely } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AutoMapper, CustomMapper, createDatabase, createRepository } from '../../src';

// Database types (snake_case) - matches example/migrations/001_create_users.ts
interface UserTable {
  id: Generated<number>;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Generated<Date> | null;
}

// Unwrapped row type (what comes back from queries)
interface UserRow {
  id: number;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date | null;
}

// DTO types (camelCase)
interface UserDTO {
  id: number;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: Date | null;
}

// Summary DTO for CustomMapper tests
interface UserSummaryDTO {
  id: number;
  displayName: string;
  isActive: boolean;
}

interface TestDB {
  users: UserTable;
}

describe('MappedRepository Integration Tests', () => {
  let db: Kysely<TestDB>;

  beforeAll(async () => {
    // Use same config as CI: port 5433, test_user, frix_test
    db = createDatabase<TestDB>({
      host: 'localhost',
      port: 5433,
      user: 'test_user',
      password: 'test_password',
      database: 'frix_test',
    });

    // Ensure table exists (migrations should have run, but create if not)
    await db.schema
      .createTable('users')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('ACTIVE'))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(db.fn('now')))
      .execute();
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean table before each test for isolation
    await db.deleteFrom('users').execute();
  });

  describe('AutoMapper - Read Operations', () => {
    it('findAll() returns DTOs with camelCase keys from actual database', async () => {
      // Insert test data directly with snake_case
      await db
        .insertInto('users')
        .values({
          email: 'test@example.com',
          name: 'Test User',
          status: 'ACTIVE',
        })
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const users = await repo.findAll();

      expect(users).toHaveLength(1);
      const user = users[0];
      expect(user).toBeDefined();
      expect(user).toHaveProperty('createdAt');
      expect(user).not.toHaveProperty('created_at');
      expect(user?.name).toBe('Test User');
      expect(user?.email).toBe('test@example.com');
    });

    it('findById() returns DTO with camelCase keys', async () => {
      const inserted = await db
        .insertInto('users')
        .values({
          email: 'findbyid@example.com',
          name: 'FindById User',
          status: 'ACTIVE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const user = await repo.findById(inserted.id);

      expect(user).not.toBeNull();
      expect(user?.name).toBe('FindById User');
      expect(user?.email).toBe('findbyid@example.com');
      expect(user).toHaveProperty('createdAt');
    });

    it('findById() returns null for non-existent record', async () => {
      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const user = await repo.findById(99999);

      expect(user).toBeNull();
    });

    it('dynamic finder findByEmail() returns DTO', async () => {
      await db
        .insertInto('users')
        .values({
          email: 'finder@example.com',
          name: 'Finder User',
          status: 'ACTIVE',
        })
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      // @ts-expect-error - dynamic finder
      const user = await repo.findByEmail('finder@example.com');

      expect(user?.name).toBe('Finder User');
      expect(user).toHaveProperty('createdAt');
    });

    it('dynamic finder findAllByStatus() returns DTOs array', async () => {
      await db
        .insertInto('users')
        .values([
          { email: 'active1@example.com', name: 'Active 1', status: 'ACTIVE' },
          { email: 'active2@example.com', name: 'Active 2', status: 'ACTIVE' },
          {
            email: 'inactive@example.com',
            name: 'Inactive',
            status: 'INACTIVE',
          },
        ])
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      // @ts-expect-error - dynamic finder
      const activeUsers = await repo.findAllByStatus('ACTIVE');

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every((u: UserDTO) => u.status === 'ACTIVE')).toBe(true);
      expect(activeUsers[0]).toHaveProperty('createdAt');
    });
  });

  describe('AutoMapper - Write Operations', () => {
    it('create() accepts DTO input and persists as snake_case', async () => {
      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const user = await repo.create({
        email: 'create@example.com',
        name: 'Created User',
        status: 'ACTIVE',
      });

      // Returns DTO with camelCase
      expect(user.name).toBe('Created User');
      expect(user).toHaveProperty('createdAt');

      // Verify database has snake_case
      const raw = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', user.id)
        .executeTakeFirst();

      expect(raw?.name).toBe('Created User');
      expect(raw).toHaveProperty('created_at');
    });

    it('update() accepts partial DTO and returns updated DTO', async () => {
      const inserted = await db
        .insertInto('users')
        .values({
          email: 'update@example.com',
          name: 'Original Name',
          status: 'ACTIVE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const updated = await repo.update(inserted.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
      expect(updated).toHaveProperty('createdAt');

      // Verify in database
      const raw = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', inserted.id)
        .executeTakeFirst();

      expect(raw?.name).toBe('Updated Name');
    });

    it('update() returns null for non-existent record', async () => {
      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const result = await repo.update(99999, { name: 'Test' });

      expect(result).toBeNull();
    });

    it('save() performs upsert with DTO', async () => {
      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      // First create
      const created = await repo.create({
        email: 'save@example.com',
        name: 'Save User',
        status: 'ACTIVE',
      });

      // Second save - update via upsert
      const saved = await repo.save({
        id: created.id,
        email: 'save@example.com',
        name: 'Updated Save User',
        status: 'INACTIVE',
      });

      expect(saved.name).toBe('Updated Save User');
      expect(saved.status).toBe('INACTIVE');
    });

    it('delete() removes record and returns true', async () => {
      const inserted = await db
        .insertInto('users')
        .values({
          email: 'delete@example.com',
          name: 'Delete User',
          status: 'ACTIVE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const result = await repo.delete(inserted.id);

      expect(result).toBe(true);

      const check = await db.selectFrom('users').where('id', '=', inserted.id).executeTakeFirst();

      expect(check).toBeUndefined();
    });
  });

  describe('AutoMapper - Batch Operations', () => {
    it('createMany() accepts DTOs and returns DTOs', async () => {
      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const users = await repo.createMany([
        { email: 'batch1@example.com', name: 'Batch 1', status: 'ACTIVE' },
        { email: 'batch2@example.com', name: 'Batch 2', status: 'ACTIVE' },
      ]);

      expect(users).toHaveLength(2);
      expect(users[0]).toHaveProperty('createdAt');
      expect(users[0]).not.toHaveProperty('created_at');
    });

    it('createMany() with skipReturn returns count', async () => {
      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const result = await repo.createMany(
        [
          { email: 'skip1@example.com', name: 'Skip 1', status: 'ACTIVE' },
          { email: 'skip2@example.com', name: 'Skip 2', status: 'ACTIVE' },
        ],
        { skipReturn: true }
      );

      expect(result).toEqual({ count: 2 });
    });

    it('updateMany() updates matching records', async () => {
      await db
        .insertInto('users')
        .values([
          { email: 'many1@example.com', name: 'Many 1', status: 'INACTIVE' },
          { email: 'many2@example.com', name: 'Many 2', status: 'INACTIVE' },
          { email: 'many3@example.com', name: 'Many 3', status: 'ACTIVE' },
        ])
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const count = await repo.updateMany({ status: 'INACTIVE' }, { status: 'ACTIVE' });

      expect(count).toBe(2);

      // Verify all are now ACTIVE
      const active = await db.selectFrom('users').where('status', '=', 'ACTIVE').execute();
      expect(active).toHaveLength(3);
    });

    it('deleteMany() removes matching records', async () => {
      await db
        .insertInto('users')
        .values([
          { email: 'del1@example.com', name: 'Del 1', status: 'INACTIVE' },
          { email: 'del2@example.com', name: 'Del 2', status: 'INACTIVE' },
          { email: 'del3@example.com', name: 'Del 3', status: 'ACTIVE' },
        ])
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const count = await repo.deleteMany({ status: 'INACTIVE' });

      expect(count).toBe(2);

      // Verify only ACTIVE remains
      const remaining = await db.selectFrom('users').execute();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('AutoMapper - Criteria Operations', () => {
    it('count() accepts camelCase criteria keys', async () => {
      await db
        .insertInto('users')
        .values([
          { email: 'count1@example.com', name: 'Count User', status: 'ACTIVE' },
          { email: 'count2@example.com', name: 'Count User', status: 'ACTIVE' },
          { email: 'count3@example.com', name: 'Other User', status: 'ACTIVE' },
        ])
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      // Use camelCase criteria - should work (name doesn't need conversion)
      const count = await repo.count({ name: 'Count User' });

      expect(count).toBe(2);
    });

    it('exists() accepts camelCase criteria keys', async () => {
      await db
        .insertInto('users')
        .values({
          email: 'exists@example.com',
          name: 'Exists User',
          status: 'ACTIVE',
        })
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const exists = await repo.exists({ name: 'Exists User' });
      const notExists = await repo.exists({ name: 'Nonexistent' });

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('Raw Access Escape Hatch', () => {
    it('raw property returns snake_case data', async () => {
      await db
        .insertInto('users')
        .values({
          email: 'raw@example.com',
          name: 'Raw User',
          status: 'ACTIVE',
        })
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const users = await repo.raw.findAll();
      const user = users[0];

      expect(user).toBeDefined();
      expect(user).toHaveProperty('created_at');
      expect(user).not.toHaveProperty('createdAt');
      expect(user?.name).toBe('Raw User');
    });

    it('query() returns raw query builder with snake_case results', async () => {
      await db
        .insertInto('users')
        .values({
          email: 'query@example.com',
          name: 'Query User',
          status: 'ACTIVE',
        })
        .execute();

      const repo = createRepository(db, 'users').withMapper(new AutoMapper<UserRow, UserDTO>());

      const results = await repo.query().where('status', '=', 'ACTIVE').execute();

      // query() returns raw snake_case
      expect(results[0]).toHaveProperty('created_at');
      expect(results[0]).not.toHaveProperty('createdAt');
    });
  });

  describe('CustomMapper Integration', () => {
    const customMapper = new CustomMapper<UserRow, UserSummaryDTO>({
      toDto: (row) => ({
        id: row.id,
        displayName: row.name,
        isActive: row.status === 'ACTIVE',
      }),
      toRow: (dto) => ({
        id: dto.id,
        email: `${dto.displayName.toLowerCase().replace(/\s+/g, '.')}@generated.com`,
        name: dto.displayName,
        status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
        created_at: new Date(),
      }),
    });

    it('findAll() applies custom transformation', async () => {
      await db
        .insertInto('users')
        .values({
          email: 'custom@example.com',
          name: 'Custom User',
          status: 'ACTIVE',
        })
        .execute();

      const repo = createRepository(db, 'users').withMapper(customMapper);

      const summaries = await repo.findAll();

      expect(summaries[0]).toHaveProperty('displayName', 'Custom User');
      expect(summaries[0]).toHaveProperty('isActive', true);
      expect(summaries[0]).not.toHaveProperty('email');
      expect(summaries[0]).not.toHaveProperty('name');
      expect(summaries[0]).not.toHaveProperty('createdAt');
    });

    it('create() applies custom toRow transformation', async () => {
      const repo = createRepository(db, 'users').withMapper(customMapper);

      const summary = await repo.create({
        displayName: 'Generated User',
        isActive: true,
      });

      expect(summary.displayName).toBe('Generated User');
      expect(summary.isActive).toBe(true);

      // Verify email was generated by custom mapper
      const raw = await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', summary.id)
        .executeTakeFirst();

      expect(raw?.email).toBe('generated.user@generated.com');
      expect(raw?.name).toBe('Generated User');
    });
  });

  describe('Chaining: extend() + withMapper()', () => {
    interface UserQueries {
      findByEmailAndStatus(email: string, status: string): Promise<UserDTO | null>;
      findAllByStatusOrderByNameAsc(status: string): Promise<UserDTO[]>;
    }

    it('extended queries return DTOs', async () => {
      await db
        .insertInto('users')
        .values([
          { email: 'chain1@example.com', name: 'Alice', status: 'ACTIVE' },
          { email: 'chain2@example.com', name: 'Bob', status: 'ACTIVE' },
          { email: 'chain3@example.com', name: 'Charlie', status: 'INACTIVE' },
        ])
        .execute();

      const repo = createRepository(db, 'users')
        .extend<UserQueries>()
        .withMapper(new AutoMapper<UserRow, UserDTO>());

      // @ts-expect-error - dynamic finder works at runtime
      const user = await repo.findByEmailAndStatus('chain1@example.com', 'ACTIVE');

      expect(user?.name).toBe('Alice');
      expect(user).toHaveProperty('createdAt');
    });

    it('ordered queries return DTOs in correct order', async () => {
      await db
        .insertInto('users')
        .values([
          { email: 'order1@example.com', name: 'Zebra', status: 'ACTIVE' },
          { email: 'order2@example.com', name: 'Apple', status: 'ACTIVE' },
          { email: 'order3@example.com', name: 'Mango', status: 'ACTIVE' },
        ])
        .execute();

      const repo = createRepository(db, 'users')
        .extend<UserQueries>()
        .withMapper(new AutoMapper<UserRow, UserDTO>());

      // @ts-expect-error - dynamic finder works at runtime
      const users = await repo.findAllByStatusOrderByNameAsc('ACTIVE');

      expect(users[0].name).toBe('Apple');
      expect(users[1].name).toBe('Mango');
      expect(users[2].name).toBe('Zebra');
      expect(users[0]).toHaveProperty('createdAt');
    });
  });
});
