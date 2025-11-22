import type { Kysely, Transaction } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTransaction } from '../../../../src/infrastructure/database';

interface UserTable {
  id: number;
  email: string;
}

interface OrderTable {
  id: number;
  userId: number;
  total: number;
}

interface TestDB {
  user: UserTable;
  order: OrderTable;
}

function createMockDb(): Kysely<TestDB> & {
  _mockTransaction: ReturnType<typeof vi.fn>;
  _lastTransactionCallback: ((trx: Transaction<TestDB>) => Promise<unknown>) | null;
} {
  let lastCallback: ((trx: Transaction<TestDB>) => Promise<unknown>) | null = null;

  const mockTransaction = vi.fn().mockImplementation(() => ({
    execute: vi
      .fn()
      .mockImplementation(async (callback: (trx: Transaction<TestDB>) => Promise<unknown>) => {
        lastCallback = callback;
        // Create a mock transaction object
        const mockTrx = {
          selectFrom: vi.fn().mockReturnValue({
            selectAll: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue([]),
            executeTakeFirst: vi.fn().mockResolvedValue(undefined),
          }),
          insertInto: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnThis(),
            returningAll: vi.fn().mockReturnThis(),
            executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ id: 1 }),
            onConflict: vi.fn().mockReturnThis(),
          }),
          updateTable: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            returningAll: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({ id: 1 }),
          }),
          deleteFrom: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({ numDeletedRows: 1n }),
          }),
        } as unknown as Transaction<TestDB>;

        return callback(mockTrx);
      }),
  }));

  return {
    transaction: mockTransaction,
    _mockTransaction: mockTransaction,
    get _lastTransactionCallback() {
      return lastCallback;
    },
  } as unknown as Kysely<TestDB> & {
    _mockTransaction: ReturnType<typeof vi.fn>;
    _lastTransactionCallback: ((trx: Transaction<TestDB>) => Promise<unknown>) | null;
  };
}

describe('withTransaction', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  it('should execute callback within transaction', async () => {
    const callback = vi.fn().mockResolvedValue('result');

    await withTransaction(mockDb, callback);

    expect(mockDb._mockTransaction).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });

  it('should return value from callback', async () => {
    const result = await withTransaction(mockDb, async () => {
      return { success: true, data: 'test' };
    });

    expect(result).toEqual({ success: true, data: 'test' });
  });

  it('should propagate error from callback', async () => {
    const error = new Error('Transaction failed');

    await expect(
      withTransaction(mockDb, async () => {
        throw error;
      })
    ).rejects.toThrow('Transaction failed');
  });

  it('should provide transaction scope to callback', async () => {
    await withTransaction(mockDb, async (scope) => {
      expect(scope).toBeDefined();
      expect(scope.getRepository).toBeDefined();
      expect(scope.transaction).toBeDefined();
    });
  });

  it('should provide working repository via getRepository', async () => {
    await withTransaction(mockDb, async (scope) => {
      const userRepo = scope.getRepository('user');
      expect(userRepo).toBeDefined();
      expect(userRepo.findAll).toBeDefined();
      expect(userRepo.create).toBeDefined();
    });
  });

  it('should allow multiple repositories in same transaction', async () => {
    await withTransaction(mockDb, async (scope) => {
      const userRepo = scope.getRepository('user');
      const orderRepo = scope.getRepository('order');

      expect(userRepo).toBeDefined();
      expect(orderRepo).toBeDefined();
    });
  });

  it('should cache repositories (lazy creation)', async () => {
    await withTransaction(mockDb, async (scope) => {
      const userRepo1 = scope.getRepository('user');
      const userRepo2 = scope.getRepository('user');

      expect(userRepo1).toBe(userRepo2);
    });
  });

  it('repository create should work within transaction', async () => {
    const result = await withTransaction(mockDb, async (scope) => {
      const userRepo = scope.getRepository('user');
      return userRepo.create({ email: 'test@example.com' });
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it('repository findAll should work within transaction', async () => {
    const result = await withTransaction(mockDb, async (scope) => {
      const userRepo = scope.getRepository('user');
      return userRepo.findAll();
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it('should expose raw transaction for advanced use', async () => {
    await withTransaction(mockDb, async (scope) => {
      expect(scope.transaction).toBeDefined();
      expect(scope.transaction.selectFrom).toBeDefined();
    });
  });
});
