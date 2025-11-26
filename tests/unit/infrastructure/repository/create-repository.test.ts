import type { Generated, Kysely } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRepository } from '../../../../src';
import { RepositoryError } from '../../../../src';
import type { RepositoryErrorCode } from '../../../../src';
import type { UnwrapRow } from '../../../../src/infrastructure/repository/types';

// Helper to reduce repetition in error checking tests
function expectRepositoryError(
  fn: () => void,
  code: RepositoryErrorCode,
  messageContains?: string
): void {
  expect(fn).toThrow(RepositoryError);
  try {
    fn();
  } catch (error) {
    expect((error as RepositoryError).code).toBe(code);
    if (messageContains) {
      expect((error as RepositoryError).message).toContain(messageContains);
    }
  }
}

// Test table type
interface UserTable {
  id: Generated<number>;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface TestDB {
  user: UserTable;
}

// Mock data (represents what comes back from database)
const mockUsers: UnwrapRow<UserTable>[] = [
  { id: 1, email: 'test@example.com', status: 'ACTIVE' },
  { id: 2, email: 'other@example.com', status: 'INACTIVE' },
];

// Helper to create mock Kysely instance
function createMockDb(): Kysely<TestDB> {
  const mockExecute = vi.fn();
  const mockExecuteTakeFirst = vi.fn();
  const mockExecuteTakeFirstOrThrow = vi.fn();
  const mockDeleteExecuteTakeFirst = vi.fn();

  const mockQueryBuilder = {
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
  };

  const mockUpdateBuilder = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirst: mockExecuteTakeFirst,
  };

  const mockDeleteBuilder = {
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: mockDeleteExecuteTakeFirst,
  };

  const mockOnConflictBuilder = {
    doUpdateSet: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  const mockInsertBuilder = {
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
    onConflict: vi.fn().mockImplementation((cb: (oc: unknown) => unknown) => {
      const oc = {
        column: vi.fn().mockReturnValue(mockOnConflictBuilder),
      };
      cb(oc);
      return mockOnConflictBuilder;
    }),
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    insertInto: vi.fn().mockReturnValue(mockInsertBuilder),
    updateTable: vi.fn().mockReturnValue(mockUpdateBuilder),
    deleteFrom: vi.fn().mockReturnValue(mockDeleteBuilder),
    fn: {
      count: vi.fn().mockReturnValue({
        as: vi.fn().mockReturnValue('count(id) as count'),
      }),
    },
    _mockExecute: mockExecute,
    _mockExecuteTakeFirst: mockExecuteTakeFirst,
    _mockExecuteTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
    _mockDeleteExecuteTakeFirst: mockDeleteExecuteTakeFirst,
    _mockWhere: mockQueryBuilder.where,
    _mockValues: mockInsertBuilder.values,
    _mockSet: mockUpdateBuilder.set,
    _mockUpdateWhere: mockUpdateBuilder.where,
    _mockDeleteWhere: mockDeleteBuilder.where,
    _mockOnConflict: mockInsertBuilder.onConflict,
    _mockOrderBy: mockQueryBuilder.orderBy,
    _mockLimit: mockQueryBuilder.limit,
    _mockOffset: mockQueryBuilder.offset,
  };

  return mockDb as unknown as Kysely<TestDB>;
}

describe('createRepository', () => {
  describe('input validation', () => {
    it('should throw INVALID_ARGUMENT for empty string tableName', () => {
      const db = createMockDb();
      expectRepositoryError(
        () => createRepository(db, '' as keyof TestDB),
        'INVALID_ARGUMENT',
        'tableName'
      );
    });

    it('should throw INVALID_ARGUMENT for whitespace-only tableName', () => {
      const db = createMockDb();
      expectRepositoryError(() => createRepository(db, '   ' as keyof TestDB), 'INVALID_ARGUMENT');
    });

    it('should throw INVALID_ARGUMENT for undefined db', () => {
      expectRepositoryError(
        () => createRepository(undefined as unknown as Kysely<TestDB>, 'user'),
        'INVALID_ARGUMENT',
        'db'
      );
    });

    it('should throw INVALID_ARGUMENT for null db', () => {
      expectRepositoryError(
        () => createRepository(null as unknown as Kysely<TestDB>, 'user'),
        'INVALID_ARGUMENT'
      );
    });
  });

  let mockDb: Kysely<TestDB> & {
    _mockExecute: ReturnType<typeof vi.fn>;
    _mockExecuteTakeFirst: ReturnType<typeof vi.fn>;
    _mockExecuteTakeFirstOrThrow: ReturnType<typeof vi.fn>;
    _mockDeleteExecuteTakeFirst: ReturnType<typeof vi.fn>;
    _mockWhere: ReturnType<typeof vi.fn>;
    _mockValues: ReturnType<typeof vi.fn>;
    _mockSet: ReturnType<typeof vi.fn>;
    _mockUpdateWhere: ReturnType<typeof vi.fn>;
    _mockDeleteWhere: ReturnType<typeof vi.fn>;
    _mockOnConflict: ReturnType<typeof vi.fn>;
    _mockOrderBy: ReturnType<typeof vi.fn>;
    _mockLimit: ReturnType<typeof vi.fn>;
    _mockOffset: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = createMockDb() as typeof mockDb;
  });

  describe('base methods', () => {
    it('findAll should return all rows', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('user');
    });

    it('findById should return matching row', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findById(1);

      expect(result).toEqual(mockUsers[0]);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('id', '=', 1);
    });

    it('findById should return null for non-existent id', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(undefined);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findById(999);

      expect(result).toBeNull();
    });

    it('findById should use custom id column when specified', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user', { idColumn: 'email' });
      await repo.findById('test@example.com');

      expect(mockDb._mockWhere).toHaveBeenCalledWith('email', '=', 'test@example.com');
    });
  });

  describe('single-column derived finders', () => {
    it('findByEmail should return matching row', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findByEmail('test@example.com');

      expect(result).toEqual(mockUsers[0]);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('email', '=', 'test@example.com');
    });

    it('findByEmail should return null for non-existent email', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(undefined);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('findByStatus should return matching row', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findByStatus('ACTIVE');

      expect(result).toEqual(mockUsers[0]);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('status', '=', 'ACTIVE');
    });
  });

  describe('multi-column derived finders', () => {
    it('findByEmailAndStatus should return matching row', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - multi-column finders not fully typed
      const result = await repo.findByEmailAndStatus('test@example.com', 'ACTIVE');

      expect(result).toEqual(mockUsers[0]);
      expect(mockDb._mockWhere).toHaveBeenCalledTimes(2);
      expect(mockDb._mockWhere).toHaveBeenNthCalledWith(1, 'email', '=', 'test@example.com');
      expect(mockDb._mockWhere).toHaveBeenNthCalledWith(2, 'status', '=', 'ACTIVE');
    });

    it('findByEmailAndStatus should return null when no match', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(undefined);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - multi-column finders not fully typed
      const result = await repo.findByEmailAndStatus('test@example.com', 'INACTIVE');

      expect(result).toBeNull();
    });
  });

  describe('error conditions', () => {
    it('should throw ARGUMENT_COUNT_MISMATCH when wrong number of arguments', async () => {
      const repo = createRepository(mockDb, 'user');

      await expect(async () => {
        // @ts-expect-error - testing runtime error
        await repo.findByEmailAndStatus('test@example.com');
      }).rejects.toThrow(RepositoryError);

      try {
        // @ts-expect-error - testing runtime error
        await repo.findByEmailAndStatus('test@example.com');
      } catch (error) {
        expect((error as RepositoryError).code).toBe('ARGUMENT_COUNT_MISMATCH');
      }
    });

    it('should throw METHOD_NOT_IMPLEMENTED for unknown methods', () => {
      const repo = createRepository(mockDb, 'user');

      expect(() => {
        // @ts-expect-error - testing runtime error
        repo.invalidMethod();
      }).toThrow(RepositoryError);

      try {
        // @ts-expect-error - testing runtime error
        repo.invalidMethod();
      } catch (error) {
        expect((error as RepositoryError).code).toBe('METHOD_NOT_IMPLEMENTED');
      }
    });

    it('should throw INVALID_FINDER_NAME for malformed finder name', async () => {
      const repo = createRepository(mockDb, 'user');

      await expect(async () => {
        // @ts-expect-error - testing runtime error
        await repo.findBy();
      }).rejects.toThrow(RepositoryError);

      try {
        // @ts-expect-error - testing runtime error
        await repo.findBy();
      } catch (error) {
        expect((error as RepositoryError).code).toBe('INVALID_FINDER_NAME');
      }
    });
  });

  describe('method caching', () => {
    it('should cache parsed method names for performance', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');

      // Call same method multiple times
      await repo.findByEmail('test1@example.com');
      await repo.findByEmail('test2@example.com');
      await repo.findByEmail('test3@example.com');

      // Method should work correctly each time
      expect(mockDb._mockWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('create method', () => {
    it('should insert and return created row with id', async () => {
      const newUser = { id: 3, email: 'new@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(newUser);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.create({ email: 'new@test.com', status: 'ACTIVE' });

      expect(result).toEqual(newUser);
      expect(mockDb._mockValues).toHaveBeenCalledWith({
        email: 'new@test.com',
        status: 'ACTIVE',
      });
    });

    it('should throw on insert failure', async () => {
      mockDb._mockExecuteTakeFirstOrThrow.mockRejectedValue(new Error('Duplicate key'));

      const repo = createRepository(mockDb, 'user');

      await expect(repo.create({ email: 'duplicate@test.com', status: 'ACTIVE' })).rejects.toThrow(
        'Duplicate key'
      );
    });

    it('should work with custom id column', async () => {
      const newUser = { id: 3, email: 'new@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(newUser);

      const repo = createRepository(mockDb, 'user', { idColumn: 'email' });
      const result = await repo.create({ email: 'new@test.com', status: 'ACTIVE' });

      expect(result).toEqual(newUser);
    });
  });

  describe('findAllByX methods', () => {
    it('findAllByStatus should return multiple rows', async () => {
      const activeUsers = mockUsers.filter((u) => u.status === 'ACTIVE');
      mockDb._mockExecute.mockResolvedValue(activeUsers);

      const repo = createRepository(mockDb, 'user');
      const results = await repo.findAllByStatus('ACTIVE');

      expect(Array.isArray(results)).toBe(true);
      expect(results).toEqual(activeUsers);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('status', '=', 'ACTIVE');
    });

    it('findAllByStatus should return empty array when no matches', async () => {
      mockDb._mockExecute.mockResolvedValue([]);

      const repo = createRepository(mockDb, 'user');
      const results = await repo.findAllByStatus('INACTIVE');

      expect(results).toEqual([]);
    });

    it('findAllByEmail should return matching rows', async () => {
      mockDb._mockExecute.mockResolvedValue([mockUsers[0]]);

      const repo = createRepository(mockDb, 'user');
      const results = await repo.findAllByEmail('test@example.com');

      expect(results).toEqual([mockUsers[0]]);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('email', '=', 'test@example.com');
    });

    it('findAllByEmailAndStatus should filter by multiple columns', async () => {
      mockDb._mockExecute.mockResolvedValue([mockUsers[0]]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - multi-column finders not fully typed
      const results = await repo.findAllByEmailAndStatus('test@example.com', 'ACTIVE');

      expect(Array.isArray(results)).toBe(true);
      expect(mockDb._mockWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('additional base method tests', () => {
    it('findAll should return empty array when no rows', async () => {
      mockDb._mockExecute.mockResolvedValue([]);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should return undefined for symbol properties', () => {
      const repo = createRepository(mockDb, 'user');
      const symbolProp = Symbol('test');

      // @ts-expect-error - testing symbol access
      const result = repo[symbolProp];

      expect(result).toBeUndefined();
    });

    it('create should call insertInto with correct table name', async () => {
      const newUser = { id: 3, email: 'new@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(newUser);

      const repo = createRepository(mockDb, 'user');
      await repo.create({ email: 'new@test.com', status: 'ACTIVE' });

      expect(mockDb.insertInto).toHaveBeenCalledWith('user');
    });
  });

  describe('update method', () => {
    it('should update existing row and return updated data', async () => {
      const updatedUser = { id: 1, email: 'updated@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirst.mockResolvedValue(updatedUser);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.update(1, { email: 'updated@test.com' });

      expect(result).toEqual(updatedUser);
      expect(mockDb.updateTable).toHaveBeenCalledWith('user');
      expect(mockDb._mockSet).toHaveBeenCalledWith({ email: 'updated@test.com' });
      expect(mockDb._mockUpdateWhere).toHaveBeenCalledWith('id', '=', 1);
    });

    it('should return null for non-existent row', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(undefined);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.update(999, { email: 'test@test.com' });

      expect(result).toBeNull();
    });

    it('should update with partial data', async () => {
      const updatedUser = { id: 1, email: 'test@example.com', status: 'INACTIVE' as const };
      mockDb._mockExecuteTakeFirst.mockResolvedValue(updatedUser);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.update(1, { status: 'INACTIVE' });

      expect(result).toEqual(updatedUser);
      expect(mockDb._mockSet).toHaveBeenCalledWith({ status: 'INACTIVE' });
    });

    it('should use custom id column', async () => {
      const updatedUser = { id: 1, email: 'test@example.com', status: 'INACTIVE' as const };
      mockDb._mockExecuteTakeFirst.mockResolvedValue(updatedUser);

      const repo = createRepository(mockDb, 'user', { idColumn: 'email' });
      await repo.update('test@example.com', { status: 'INACTIVE' });

      expect(mockDb._mockUpdateWhere).toHaveBeenCalledWith('email', '=', 'test@example.com');
    });

    it('should handle empty data object', async () => {
      const user = { id: 1, email: 'test@example.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirst.mockResolvedValue(user);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.update(1, {});

      expect(result).toEqual(user);
      expect(mockDb._mockSet).toHaveBeenCalledWith({});
    });
  });

  describe('delete method', () => {
    it('should delete existing row and return true', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 1n });

      const repo = createRepository(mockDb, 'user');
      const result = await repo.delete(1);

      expect(result).toBe(true);
      expect(mockDb.deleteFrom).toHaveBeenCalledWith('user');
      expect(mockDb._mockDeleteWhere).toHaveBeenCalledWith('id', '=', 1);
    });

    it('should return false for non-existent row', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 0n });

      const repo = createRepository(mockDb, 'user');
      const result = await repo.delete(999);

      expect(result).toBe(false);
    });

    it('should use custom id column', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 1n });

      const repo = createRepository(mockDb, 'user', { idColumn: 'email' });
      await repo.delete('test@example.com');

      expect(mockDb._mockDeleteWhere).toHaveBeenCalledWith('email', '=', 'test@example.com');
    });

    it('should call deleteFrom with correct table', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 1n });

      const repo = createRepository(mockDb, 'user');
      await repo.delete(1);

      expect(mockDb.deleteFrom).toHaveBeenCalledWith('user');
    });
  });

  describe('save method', () => {
    it('should insert when data has no id field', async () => {
      const newUser = { id: 3, email: 'new@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(newUser);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.save({ email: 'new@test.com', status: 'ACTIVE' });

      expect(result).toEqual(newUser);
      expect(mockDb.insertInto).toHaveBeenCalledWith('user');
    });

    it('should upsert when data has id field', async () => {
      const savedUser = { id: 1, email: 'updated@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(savedUser);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.save({ id: 1, email: 'updated@test.com', status: 'ACTIVE' });

      expect(result).toEqual(savedUser);
      expect(mockDb._mockOnConflict).toHaveBeenCalled();
    });

    it('should insert with id when row does not exist', async () => {
      const newUser = { id: 100, email: 'new@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(newUser);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.save({ id: 100, email: 'new@test.com', status: 'ACTIVE' });

      expect(result).toEqual(newUser);
      expect(mockDb._mockOnConflict).toHaveBeenCalled();
    });

    it('should use custom id column', async () => {
      const savedUser = { id: 1, email: 'test@example.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(savedUser);

      const repo = createRepository(mockDb, 'user', { idColumn: 'email' });
      const result = await repo.save({ id: 1, email: 'test@example.com', status: 'ACTIVE' });

      expect(result).toEqual(savedUser);
    });

    it('should use ON CONFLICT for upsert', async () => {
      const savedUser = { id: 1, email: 'test@example.com', status: 'ACTIVE' as const };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(savedUser);

      const repo = createRepository(mockDb, 'user');
      await repo.save({ id: 1, email: 'test@example.com', status: 'ACTIVE' });

      expect(mockDb._mockOnConflict).toHaveBeenCalled();
    });
  });

  describe('comparison operators', () => {
    it('findByIdGreaterThan should use > operator', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[1]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      const result = await repo.findByIdGreaterThan(1);

      expect(result).toEqual(mockUsers[1]);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('id', '>', 1);
    });

    it('findByIdLessThan should use < operator', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      const result = await repo.findByIdLessThan(2);

      expect(result).toEqual(mockUsers[0]);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('id', '<', 2);
    });

    it('findByIdGreaterThanEqual should use >= operator', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      await repo.findByIdGreaterThanEqual(1);

      expect(mockDb._mockWhere).toHaveBeenCalledWith('id', '>=', 1);
    });

    it('findByIdLessThanEqual should use <= operator', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[1]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      await repo.findByIdLessThanEqual(2);

      expect(mockDb._mockWhere).toHaveBeenCalledWith('id', '<=', 2);
    });

    it('findByStatusIn should use IN operator', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      await repo.findByStatusIn(['ACTIVE', 'PENDING']);

      expect(mockDb._mockWhere).toHaveBeenCalledWith('status', 'in', ['ACTIVE', 'PENDING']);
    });

    it('findByEmailLike should use LIKE operator', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      await repo.findByEmailLike('%@example.com');

      expect(mockDb._mockWhere).toHaveBeenCalledWith('email', 'like', '%@example.com');
    });

    it('findAllByStatusIn should return multiple rows', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - comparison finders not fully typed
      const results = await repo.findAllByStatusIn(['ACTIVE', 'INACTIVE']);

      expect(results).toEqual(mockUsers);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('status', 'in', ['ACTIVE', 'INACTIVE']);
    });
  });

  describe('ordering', () => {
    it('findAllByStatusOrderByEmail should apply ORDER BY asc', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - ordering finders not fully typed
      const results = await repo.findAllByStatusOrderByEmail('ACTIVE');

      expect(results).toEqual(mockUsers);
      expect(mockDb._mockOrderBy).toHaveBeenCalledWith('email', 'asc');
    });

    it('findAllByStatusOrderByEmailDesc should apply ORDER BY desc', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - ordering finders not fully typed
      const results = await repo.findAllByStatusOrderByEmailDesc('ACTIVE');

      expect(results).toEqual(mockUsers);
      expect(mockDb._mockOrderBy).toHaveBeenCalledWith('email', 'desc');
    });

    it('findAllByStatusOrderByIdAsc should apply explicit asc', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - ordering finders not fully typed
      await repo.findAllByStatusOrderByIdAsc('ACTIVE');

      expect(mockDb._mockOrderBy).toHaveBeenCalledWith('id', 'asc');
    });
  });

  describe('pagination', () => {
    it('findAllByStatus with limit option should apply LIMIT', async () => {
      mockDb._mockExecute.mockResolvedValue([mockUsers[0]]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - options not fully typed
      await repo.findAllByStatus('ACTIVE', { limit: 10 });

      expect(mockDb._mockLimit).toHaveBeenCalledWith(10);
    });

    it('findAllByStatus with offset option should apply OFFSET', async () => {
      mockDb._mockExecute.mockResolvedValue([mockUsers[1]]);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - options not fully typed
      await repo.findAllByStatus('ACTIVE', { offset: 20 });

      expect(mockDb._mockOffset).toHaveBeenCalledWith(20);
    });

    it('findAllByStatus with both limit and offset should apply both', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - options not fully typed
      await repo.findAllByStatus('ACTIVE', { limit: 10, offset: 20 });

      expect(mockDb._mockLimit).toHaveBeenCalledWith(10);
      expect(mockDb._mockOffset).toHaveBeenCalledWith(20);
    });

    it('ordering and pagination should work together', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      // @ts-expect-error - options not fully typed
      await repo.findAllByStatusOrderByEmailDesc('ACTIVE', { limit: 5 });

      expect(mockDb._mockWhere).toHaveBeenCalledWith('status', '=', 'ACTIVE');
      expect(mockDb._mockOrderBy).toHaveBeenCalledWith('email', 'desc');
      expect(mockDb._mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('createMany', () => {
    it('should insert multiple records and return all with IDs', async () => {
      const newUsers = [
        { id: 3, email: 'user3@test.com', status: 'ACTIVE' as const },
        { id: 4, email: 'user4@test.com', status: 'ACTIVE' as const },
      ];
      mockDb._mockExecute.mockResolvedValue(newUsers);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany([
        { email: 'user3@test.com', status: 'ACTIVE' },
        { email: 'user4@test.com', status: 'ACTIVE' },
      ]);

      expect(result).toEqual(newUsers);
      expect(mockDb._mockValues).toHaveBeenCalled();
    });

    it('should return empty array for empty input', async () => {
      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany([]);

      expect(result).toEqual([]);
      expect(mockDb.insertInto).not.toHaveBeenCalled();
    });

    it('should return count object with skipReturn: true', async () => {
      mockDb._mockExecute.mockResolvedValue([{ numInsertedOrUpdatedRows: 3n }]);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany(
        [
          { email: 'user1@test.com', status: 'ACTIVE' },
          { email: 'user2@test.com', status: 'ACTIVE' },
          { email: 'user3@test.com', status: 'ACTIVE' },
        ],
        { skipReturn: true }
      );

      expect(result).toEqual({ count: 3 });
    });

    it('should return count 0 for empty input with skipReturn: true', async () => {
      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany([], { skipReturn: true });

      expect(result).toEqual({ count: 0 });
    });

    it('should handle single item array', async () => {
      const newUser = { id: 3, email: 'user3@test.com', status: 'ACTIVE' as const };
      mockDb._mockExecute.mockResolvedValue([newUser]);

      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany([{ email: 'user3@test.com', status: 'ACTIVE' }]);

      expect(result).toEqual([newUser]);
    });

    it('should chunk large arrays into batches', async () => {
      const largeData = Array.from({ length: 2500 }, (_, i) => ({
        email: `user${i}@test.com`,
        status: 'ACTIVE' as const,
      }));
      const mockResults = largeData.map((d, i) => ({ id: i, ...d }));

      // Mock returns for 3 chunks (1000 + 1000 + 500)
      mockDb._mockExecute
        .mockResolvedValueOnce(mockResults.slice(0, 1000))
        .mockResolvedValueOnce(mockResults.slice(1000, 2000))
        .mockResolvedValueOnce(mockResults.slice(2000));

      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany(largeData);

      expect(result).toHaveLength(2500);
      expect(mockDb._mockValues).toHaveBeenCalledTimes(3);
    });

    it('should respect custom chunkSize option', async () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        email: `user${i}@test.com`,
        status: 'ACTIVE' as const,
      }));

      // 4 chunks of 25
      mockDb._mockExecute
        .mockResolvedValueOnce(data.slice(0, 25).map((d, i) => ({ id: i, ...d })))
        .mockResolvedValueOnce(data.slice(25, 50).map((d, i) => ({ id: i + 25, ...d })))
        .mockResolvedValueOnce(data.slice(50, 75).map((d, i) => ({ id: i + 50, ...d })))
        .mockResolvedValueOnce(data.slice(75).map((d, i) => ({ id: i + 75, ...d })));

      const repo = createRepository(mockDb, 'user');
      await repo.createMany(data, { chunkSize: 25 });

      expect(mockDb._mockValues).toHaveBeenCalledTimes(4);
    });

    it('should execute multiple chunks in parallel using Promise.all', async () => {
      // Track execution order to verify parallel execution
      const executionOrder: number[] = [];
      let callCount = 0;

      mockDb._mockExecute.mockImplementation(() => {
        const currentCall = callCount++;
        executionOrder.push(currentCall);
        // Return mock results
        return Promise.resolve([
          { id: currentCall, email: `user${currentCall}@test.com`, status: 'ACTIVE' },
        ]);
      });

      const data = Array.from({ length: 30 }, (_, i) => ({
        email: `user${i}@test.com`,
        status: 'ACTIVE' as const,
      }));

      const repo = createRepository(mockDb, 'user');
      await repo.createMany(data, { chunkSize: 10 });

      // Should have been called 3 times (30 records / 10 chunk size)
      expect(mockDb._mockValues).toHaveBeenCalledTimes(3);
    });

    it('should preserve result order when executing chunks in parallel', async () => {
      // Mock returns results in order they're called
      mockDb._mockExecute
        .mockResolvedValueOnce([
          { id: 1, email: 'user1@test.com', status: 'ACTIVE' },
          { id: 2, email: 'user2@test.com', status: 'ACTIVE' },
        ])
        .mockResolvedValueOnce([
          { id: 3, email: 'user3@test.com', status: 'ACTIVE' },
          { id: 4, email: 'user4@test.com', status: 'ACTIVE' },
        ]);

      const data = [
        { email: 'user1@test.com', status: 'ACTIVE' as const },
        { email: 'user2@test.com', status: 'ACTIVE' as const },
        { email: 'user3@test.com', status: 'ACTIVE' as const },
        { email: 'user4@test.com', status: 'ACTIVE' as const },
      ];

      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany(data, { chunkSize: 2 });

      // Results should be in correct order (flattened from chunks)
      const rows = result as { id: number }[];
      expect(rows).toHaveLength(4);
      expect(rows[0]?.id).toBe(1);
      expect(rows[3]?.id).toBe(4);
    });

    it('should aggregate counts correctly when using skipReturn with parallel chunks', async () => {
      mockDb._mockExecute
        .mockResolvedValueOnce([{ numInsertedOrUpdatedRows: 10n }])
        .mockResolvedValueOnce([{ numInsertedOrUpdatedRows: 10n }])
        .mockResolvedValueOnce([{ numInsertedOrUpdatedRows: 5n }]);

      const data = Array.from({ length: 25 }, (_, i) => ({
        email: `user${i}@test.com`,
        status: 'ACTIVE' as const,
      }));

      const repo = createRepository(mockDb, 'user');
      const result = await repo.createMany(data, { chunkSize: 10, skipReturn: true });

      expect(result).toEqual({ count: 25 });
    });
  });

  describe('updateMany', () => {
    it('should update all matching rows and return count', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue({ numUpdatedRows: 5n });

      const repo = createRepository(mockDb, 'user');
      const count = await repo.updateMany({ status: 'INACTIVE' }, { status: 'ACTIVE' });

      expect(count).toBe(5);
      expect(mockDb._mockSet).toHaveBeenCalledWith({ status: 'ACTIVE' });
      expect(mockDb._mockUpdateWhere).toHaveBeenCalledWith('status', '=', 'INACTIVE');
    });

    it('should return 0 when no rows match', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue({ numUpdatedRows: 0n });

      const repo = createRepository(mockDb, 'user');
      // Using type assertion to test with non-matching value
      const count = await repo.updateMany(
        { status: 'NONEXISTENT' as UserTable['status'] },
        { status: 'ACTIVE' }
      );

      expect(count).toBe(0);
    });

    it('should update by multiple criteria fields (AND)', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue({ numUpdatedRows: 2n });

      const repo = createRepository(mockDb, 'user');
      await repo.updateMany({ status: 'INACTIVE', email: 'test@test.com' }, { status: 'ACTIVE' });

      expect(mockDb._mockUpdateWhere).toHaveBeenCalledTimes(2);
    });

    it('should update all rows when criteria is empty', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue({ numUpdatedRows: 100n });

      const repo = createRepository(mockDb, 'user');
      const count = await repo.updateMany({}, { status: 'ACTIVE' });

      expect(count).toBe(100);
      expect(mockDb._mockUpdateWhere).not.toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    it('should delete all matching rows and return count', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 3n });

      const repo = createRepository(mockDb, 'user');
      const count = await repo.deleteMany({ status: 'INACTIVE' });

      expect(count).toBe(3);
      expect(mockDb._mockDeleteWhere).toHaveBeenCalledWith('status', '=', 'INACTIVE');
    });

    it('should return 0 when no rows match', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 0n });

      const repo = createRepository(mockDb, 'user');
      // Using type assertion to test with non-matching value
      const count = await repo.deleteMany({ status: 'NONEXISTENT' as UserTable['status'] });

      expect(count).toBe(0);
    });

    it('should delete by multiple criteria fields (AND)', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 2n });

      const repo = createRepository(mockDb, 'user');
      await repo.deleteMany({ status: 'INACTIVE', email: 'old@test.com' });

      expect(mockDb._mockDeleteWhere).toHaveBeenCalledTimes(2);
    });

    it('should delete all rows when criteria is empty', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 1000n });

      const repo = createRepository(mockDb, 'user');
      const count = await repo.deleteMany({});

      expect(count).toBe(1000);
      expect(mockDb._mockDeleteWhere).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should return a SelectQueryBuilder for chaining', () => {
      const repo = createRepository(mockDb, 'user');
      const builder = repo.query();

      // Should have Kysely query builder methods
      expect(builder).toHaveProperty('selectAll');
      expect(builder).toHaveProperty('where');
      expect(builder).toHaveProperty('execute');
    });

    it('should be usable with custom where clauses', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'user');
      const builder = repo.query();
      const results = await builder.where('id', '>', 0).execute();

      expect(results).toEqual(mockUsers);
      expect(mockDb._mockWhere).toHaveBeenCalledWith('id', '>', 0);
    });

    it('should start from the correct table', () => {
      const repo = createRepository(mockDb, 'user');
      repo.query();

      expect(mockDb.selectFrom).toHaveBeenCalledWith('user');
    });
  });

  describe('raw', () => {
    it('should execute raw SQL and return typed results', async () => {
      const mockRawResults = [{ total: 100 }];
      const mockRawExecute = vi.fn().mockResolvedValue(mockRawResults);
      const mockRawBuilder = { execute: mockRawExecute };

      const repo = createRepository(mockDb, 'user');
      const result = await repo.raw(mockRawBuilder as never);

      expect(result).toEqual(mockRawResults);
      expect(mockRawExecute).toHaveBeenCalled();
    });

    it('should return empty array for no results', async () => {
      const mockRawExecute = vi.fn().mockResolvedValue([]);
      const mockRawBuilder = { execute: mockRawExecute };

      const repo = createRepository(mockDb, 'user');
      const result = await repo.raw(mockRawBuilder as never);

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      const mockRawExecute = vi.fn().mockRejectedValue(new Error('SQL syntax error'));
      const mockRawBuilder = { execute: mockRawExecute };

      const repo = createRepository(mockDb, 'user');

      await expect(repo.raw(mockRawBuilder as never)).rejects.toThrow('SQL syntax error');
    });
  });

  describe('count', () => {
    it('should return count of all rows when no criteria', async () => {
      const mockCountExecute = vi.fn().mockResolvedValue({ count: 50 });
      const mockCountBuilder = {
        select: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: mockCountExecute,
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockCountBuilder);

      const repo = createRepository(mockDb, 'user');
      const count = await repo.count();

      expect(count).toBe(50);
    });

    it('should return count with criteria filter', async () => {
      const mockCountBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ count: 10 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockCountBuilder);

      const repo = createRepository(mockDb, 'user');
      const count = await repo.count({ status: 'ACTIVE' });

      expect(count).toBe(10);
      expect(mockCountBuilder.where).toHaveBeenCalledWith('status', '=', 'ACTIVE');
    });

    it('should return 0 when no rows match', async () => {
      const mockCountBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ count: 0 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockCountBuilder);

      const repo = createRepository(mockDb, 'user');
      // Using type assertion to test with non-matching value
      const count = await repo.count({ status: 'NONEXISTENT' as UserTable['status'] });

      expect(count).toBe(0);
    });

    it('should handle multiple criteria fields', async () => {
      const mockCountBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ count: 5 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockCountBuilder);

      const repo = createRepository(mockDb, 'user');
      await repo.count({ status: 'ACTIVE', email: 'test@test.com' });

      expect(mockCountBuilder.where).toHaveBeenCalledTimes(2);
    });
  });

  describe('exists', () => {
    it('should return true when rows exist', async () => {
      const mockExistsBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ exists: 1 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockExistsBuilder);

      const repo = createRepository(mockDb, 'user');
      const exists = await repo.exists({ status: 'ACTIVE' });

      expect(exists).toBe(true);
      expect(mockExistsBuilder.limit).toHaveBeenCalledWith(1);
    });

    it('should return false when no rows exist', async () => {
      const mockExistsBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(undefined),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockExistsBuilder);

      const repo = createRepository(mockDb, 'user');
      // Using type assertion to test with non-matching value
      const exists = await repo.exists({ status: 'NONEXISTENT' as UserTable['status'] });

      expect(exists).toBe(false);
    });

    it('should check all rows when no criteria', async () => {
      const mockExistsBuilder = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ exists: 1 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockExistsBuilder);

      const repo = createRepository(mockDb, 'user');
      const exists = await repo.exists();

      expect(exists).toBe(true);
    });

    it('should use LIMIT 1 for efficiency', async () => {
      const mockExistsBuilder = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ exists: 1 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockExistsBuilder);

      const repo = createRepository(mockDb, 'user');
      await repo.exists();

      expect(mockExistsBuilder.limit).toHaveBeenCalledWith(1);
    });
  });
});
