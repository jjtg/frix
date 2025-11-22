import type { Kysely } from 'kysely';
import { describe, expect, it, vi } from 'vitest';
import { checkDatabaseHealth } from '../../../../src/infrastructure/database';

interface TestDB {
  user: { id: number };
}

function createMockDb(options?: {
  shouldFail?: boolean;
  error?: Error;
  delay?: number;
}): Kysely<TestDB> & { _mockExecute: ReturnType<typeof vi.fn> } {
  const mockExecute = vi.fn().mockImplementation(async () => {
    if (options?.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
    if (options?.shouldFail) {
      throw options?.error || new Error('Connection failed');
    }
    return { rows: [{ result: 1 }] };
  });

  const mockDb = {
    getExecutor: vi.fn().mockReturnValue({
      executeQuery: mockExecute,
    }),
  } as unknown as Kysely<TestDB> & { _mockExecute: ReturnType<typeof vi.fn> };

  mockDb._mockExecute = mockExecute;
  return mockDb;
}

describe('checkDatabaseHealth', () => {
  it('should return healthy: true for working connection', async () => {
    const mockDb = createMockDb();

    const result = await checkDatabaseHealth(mockDb);

    expect(result.healthy).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return latencyMs as number', async () => {
    const mockDb = createMockDb({ delay: 5 });

    const result = await checkDatabaseHealth(mockDb);

    expect(result.latencyMs).toBeTypeOf('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should return healthy: false for failed connection', async () => {
    const mockDb = createMockDb({ shouldFail: true });

    const result = await checkDatabaseHealth(mockDb);

    expect(result.healthy).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should include error message for failed connection', async () => {
    const mockDb = createMockDb({
      shouldFail: true,
      error: new Error('Connection refused'),
    });

    const result = await checkDatabaseHealth(mockDb);

    expect(result.healthy).toBe(false);
    expect(result.error).toBe('Connection refused');
  });

  it('should measure latency even for failed connection', async () => {
    const mockDb = createMockDb({ shouldFail: true, delay: 5 });

    const result = await checkDatabaseHealth(mockDb);

    expect(result.latencyMs).toBeTypeOf('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle database errors gracefully', async () => {
    const mockDb = createMockDb({ shouldFail: true });

    const result = await checkDatabaseHealth(mockDb);

    expect(result.healthy).toBe(false);
    expect(result.error).toBeDefined();
  });
});
