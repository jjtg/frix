import type { Kysely } from 'kysely';
import type { HealthCheckResult } from './types';

/**
 * Checks database health by executing a lightweight query.
 *
 * Executes a `SELECT 1` query to verify the database connection is working
 * and measures the response latency.
 *
 * @template DB - The database schema type
 *
 * @param db - The Kysely database instance to check
 *
 * @returns Health check result with status and latency
 *
 * @example
 * ```typescript
 * const health = await checkDatabaseHealth(db);
 * if (health.healthy) {
 *   console.log(`Database OK (${health.latencyMs}ms)`);
 * } else {
 *   console.error(`Database error: ${health.error}`);
 * }
 * ```
 */
export async function checkDatabaseHealth<DB>(db: Kysely<DB>): Promise<HealthCheckResult> {
  const startTime = performance.now();

  try {
    // Execute lightweight health check query using raw SQL
    // Access internal executeQuery method via unknown cast
    const executor = (
      db as unknown as {
        getExecutor(): { executeQuery(query: unknown, queryId: unknown): Promise<unknown> };
      }
    ).getExecutor();
    await executor.executeQuery(
      { sql: 'SELECT 1', parameters: [], kind: 'RawNode' },
      { queryId: 'health-check' }
    );

    const latencyMs = performance.now() - startTime;

    return {
      healthy: true,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = performance.now() - startTime;

    return {
      healthy: false,
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
