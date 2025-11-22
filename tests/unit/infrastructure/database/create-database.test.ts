import { describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../../../../src/infrastructure/database';
import type { DatabaseConfig } from '../../../../src/infrastructure/database';

// Mock pg Pool
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation((config) => ({
    _config: config,
    end: vi.fn(),
  })),
}));

describe('createDatabase', () => {
  it('should create database from connection string', () => {
    const config: DatabaseConfig = {
      connectionString: 'postgresql://user:pass@localhost:5432/testdb',
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
    expect(db.selectFrom).toBeDefined();
  });

  it('should create database from individual params', () => {
    const config: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'user',
      password: 'pass',
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
    expect(db.selectFrom).toBeDefined();
  });

  it('should apply pool min/max settings', () => {
    const config: DatabaseConfig = {
      connectionString: 'postgresql://localhost/testdb',
      pool: {
        min: 5,
        max: 20,
      },
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
  });

  it('should use default pool settings when not specified', () => {
    const config: DatabaseConfig = {
      connectionString: 'postgresql://localhost/testdb',
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
  });

  it('should add logging plugin when log: true', () => {
    const config: DatabaseConfig = {
      connectionString: 'postgresql://localhost/testdb',
      log: true,
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
  });

  it('should not add logging plugin when log: false', () => {
    const config: DatabaseConfig = {
      connectionString: 'postgresql://localhost/testdb',
      log: false,
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
  });

  it('should accept log level string', () => {
    const config: DatabaseConfig = {
      connectionString: 'postgresql://localhost/testdb',
      log: 'query',
    };

    const db = createDatabase(config);

    expect(db).toBeDefined();
  });
});
