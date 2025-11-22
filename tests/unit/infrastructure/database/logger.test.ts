import { describe, expect, it, vi } from 'vitest';
import {
  type QueryLogEvent,
  type QueryLogger,
  consoleLogger,
  createLoggingPlugin,
} from '../../../../src/infrastructure/database';

describe('createLoggingPlugin', () => {
  it('should create a Kysely plugin', () => {
    const plugin = createLoggingPlugin();

    expect(plugin).toBeDefined();
    expect(plugin.transformQuery).toBeDefined();
    expect(plugin.transformResult).toBeDefined();
  });

  it('should call custom logger with query event', async () => {
    const customLogger: QueryLogger = {
      log: vi.fn(),
    };

    const plugin = createLoggingPlugin(customLogger);

    // Simulate query transformation - Kysely passes node, not compiled query
    const mockQueryArgs = {
      queryId: { queryId: '1' },
      node: { kind: 'SelectQueryNode' },
    };

    // Transform query (starts timing)
    plugin.transformQuery(mockQueryArgs as never);

    // Simulate result transformation (ends timing and logs)
    // In Kysely, the compiled query is available here
    const mockResultArgs = {
      queryId: { queryId: '1' },
      result: {
        rows: [],
        query: {
          sql: 'SELECT * FROM users WHERE id = $1',
          parameters: [1],
        },
      },
    };

    await plugin.transformResult(mockResultArgs as never);

    expect(customLogger.log).toHaveBeenCalled();
    const event = (customLogger.log as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as QueryLogEvent;
    expect(event.query).toBeDefined();
    expect(event.parameters).toBeDefined();
    expect(event.duration).toBeTypeOf('number');
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should log query string', async () => {
    const customLogger: QueryLogger = {
      log: vi.fn(),
    };

    const plugin = createLoggingPlugin(customLogger);
    const sqlQuery = 'SELECT * FROM users';

    plugin.transformQuery({
      queryId: { queryId: '2' },
      node: { kind: 'SelectQueryNode' },
    } as never);

    await plugin.transformResult({
      queryId: { queryId: '2' },
      result: {
        rows: [],
        query: { sql: sqlQuery, parameters: [] },
      },
    } as never);

    const event = (customLogger.log as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as QueryLogEvent;
    expect(event.query).toBe(sqlQuery);
  });

  it('should log parameters', async () => {
    const customLogger: QueryLogger = {
      log: vi.fn(),
    };

    const plugin = createLoggingPlugin(customLogger);
    const params = [1, 'test', true];

    plugin.transformQuery({
      queryId: { queryId: '3' },
      node: { kind: 'SelectQueryNode' },
    } as never);

    await plugin.transformResult({
      queryId: { queryId: '3' },
      result: {
        rows: [],
        query: {
          sql: 'SELECT * FROM users WHERE id = $1 AND name = $2 AND active = $3',
          parameters: params,
        },
      },
    } as never);

    const event = (customLogger.log as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as QueryLogEvent;
    expect(event.parameters).toEqual(params);
  });

  it('should measure duration in milliseconds', async () => {
    const customLogger: QueryLogger = {
      log: vi.fn(),
    };

    const plugin = createLoggingPlugin(customLogger);

    plugin.transformQuery({
      queryId: { queryId: '4' },
      node: { kind: 'SelectQueryNode' },
    } as never);

    // Small delay to ensure duration > 0
    await new Promise((resolve) => setTimeout(resolve, 5));

    await plugin.transformResult({
      queryId: { queryId: '4' },
      result: {
        rows: [],
        query: { sql: 'SELECT 1', parameters: [] },
      },
    } as never);

    const event = (customLogger.log as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as QueryLogEvent;
    expect(event.duration).toBeGreaterThanOrEqual(0);
    expect(event.duration).toBeLessThan(1000); // Should be milliseconds, not seconds
  });

  it('should use default console logger when none provided', () => {
    const plugin = createLoggingPlugin();

    // Should not throw when created without logger
    expect(plugin).toBeDefined();
  });
});

describe('consoleLogger', () => {
  it('should be a valid QueryLogger', () => {
    expect(consoleLogger).toBeDefined();
    expect(consoleLogger.log).toBeDefined();
    expect(typeof consoleLogger.log).toBe('function');
  });

  it('should format and log events', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const event: QueryLogEvent = {
      query: 'SELECT * FROM users',
      parameters: [1],
      duration: 5.23,
      timestamp: new Date('2025-01-01T00:00:00Z'),
    };

    consoleLogger.log(event);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
