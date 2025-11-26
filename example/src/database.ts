import { createDatabase } from 'frix';
import type { Database } from './types.js';

/**
 * Creates the database connection with optional query logging.
 *
 * The createDatabase() helper:
 * - Automatically configures PostgresDialect with pg connection pool
 * - Supports built-in query logging via the `log` option
 * - Uses sensible pool defaults (min: 2, max: 10)
 *
 * @param enableLogging - Set to true to log all SQL queries to console
 * @returns Kysely database instance
 *
 * @example
 * ```typescript
 * // Without logging (production)
 * const db = getDatabase();
 *
 * // With logging (development)
 * const db = getDatabase(true);
 * // Output: [QUERY] SELECT * FROM users WHERE id = $1 (5ms)
 * ```
 */
export function getDatabase(enableLogging = false) {
  return createDatabase<Database>({
    host: 'localhost',
    port: 5432,
    user: 'frix',
    password: 'frix',
    database: 'frix_example',
    pool: {
      max: 10, // Connection pool size
    },
    log: enableLogging, // Enable SQL query logging
  });
}
