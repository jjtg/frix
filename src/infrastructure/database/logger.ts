import type { KyselyPlugin, PluginTransformQueryArgs, PluginTransformResultArgs } from 'kysely';
import type { QueryLogEvent, QueryLogger } from './types';

export type { QueryLogEvent, QueryLogger };

/**
 * Default console logger implementation.
 *
 * Logs queries to console.info with timestamp, duration, SQL, and parameters.
 */
export const consoleLogger: QueryLogger = {
  log(event: QueryLogEvent): void {
    console.info(
      `[${event.timestamp.toISOString()}] ${event.duration.toFixed(2)}ms - ${event.query}`,
      event.parameters.length > 0 ? event.parameters : ''
    );
  },
};

/**
 * Creates a Kysely plugin for query logging with timing metrics.
 *
 * The plugin measures query execution time and logs the SQL, parameters,
 * and duration using the provided logger.
 *
 * @param logger - Logger implementation (defaults to consoleLogger)
 *
 * @returns A Kysely plugin that logs queries
 *
 * @example
 * ```typescript
 * const db = new Kysely<Database>({
 *   dialect,
 *   plugins: [createLoggingPlugin()],
 * });
 *
 * // Or with custom logger
 * const customLogger: QueryLogger = {
 *   log: (event) => myLogger.info(event.query, event.duration),
 * };
 * const plugin = createLoggingPlugin(customLogger);
 * ```
 */
export function createLoggingPlugin(logger: QueryLogger = consoleLogger): KyselyPlugin {
  // Store start times by query ID
  const queryTimes = new Map<string, number>();

  return {
    transformQuery(args: PluginTransformQueryArgs): ReturnType<KyselyPlugin['transformQuery']> {
      const queryId = String((args.queryId as { queryId: string }).queryId);
      queryTimes.set(queryId, performance.now());
      return args.node;
    },

    async transformResult(
      args: PluginTransformResultArgs
    ): ReturnType<KyselyPlugin['transformResult']> {
      const queryId = String((args.queryId as { queryId: string }).queryId);
      const startTime = queryTimes.get(queryId);

      if (startTime !== undefined) {
        const duration = performance.now() - startTime;

        // Extract query info from result
        const result = args.result as {
          query?: { sql: string; parameters: readonly unknown[] };
        };

        const event: QueryLogEvent = {
          query: result.query?.sql || '',
          parameters: result.query?.parameters || [],
          duration,
          timestamp: new Date(),
        };

        logger.log(event);

        // Clean up
        queryTimes.delete(queryId);
      }

      return args.result;
    },
  };
}
