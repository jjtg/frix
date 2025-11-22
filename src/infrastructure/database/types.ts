import type { Transaction } from 'kysely';
import type { Repository } from '../repository';

/** Database configuration */
export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  pool?: {
    min?: number;
    max?: number;
  };
  log?: boolean | LogLevel;
}

export type LogLevel = 'query' | 'error' | 'all';

/** Transaction scope for atomic operations */
export interface TransactionScope<DB> {
  /** Get a repository that participates in this transaction */
  getRepository<TName extends keyof DB & string>(tableName: TName): Repository<DB, TName>;

  /** Access the raw transaction for advanced use */
  transaction: Transaction<DB>;
}

/** Query log event */
export interface QueryLogEvent {
  query: string;
  parameters: readonly unknown[];
  duration: number;
  timestamp: Date;
}

/** Query logger interface */
export interface QueryLogger {
  log(event: QueryLogEvent): void;
}

/** Health check result */
export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}
