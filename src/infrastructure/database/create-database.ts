import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { createLoggingPlugin } from './logger';
import type { DatabaseConfig } from './types';

const DEFAULT_POOL_MIN = 2;
const DEFAULT_POOL_MAX = 10;

/**
 * Creates a Kysely database instance with PostgreSQL dialect and connection pooling.
 *
 * @template DB - The database schema type
 *
 * @param config - Database configuration options
 * @param config.connectionString - PostgreSQL connection string (alternative to individual params)
 * @param config.host - Database host
 * @param config.port - Database port
 * @param config.database - Database name
 * @param config.user - Database user
 * @param config.password - Database password
 * @param config.pool - Connection pool options (min, max)
 * @param config.log - Enable query logging
 *
 * @returns A configured Kysely database instance
 *
 * @example
 * ```typescript
 * const db = createDatabase<Database>({
 *   host: 'localhost',
 *   port: 5432,
 *   user: 'postgres',
 *   password: 'password',
 *   database: 'myapp',
 *   pool: { min: 2, max: 10 },
 *   log: true,
 * });
 * ```
 */
export function createDatabase<DB>(config: DatabaseConfig): Kysely<DB> {
  const poolConfig = config.connectionString
    ? {
        connectionString: config.connectionString,
        min: config.pool?.min ?? DEFAULT_POOL_MIN,
        max: config.pool?.max ?? DEFAULT_POOL_MAX,
      }
    : {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        min: config.pool?.min ?? DEFAULT_POOL_MIN,
        max: config.pool?.max ?? DEFAULT_POOL_MAX,
      };

  const dialect = new PostgresDialect({
    pool: new Pool(poolConfig),
  });

  const plugins = [];

  if (config.log) {
    plugins.push(createLoggingPlugin());
  }

  return new Kysely<DB>({
    dialect,
    plugins,
  });
}
