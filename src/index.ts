// Repository
export {
  createRepository,
  parseFinderColumns,
  parseFinderMethod,
} from './infrastructure/repository';
export type {
  Repository,
  BaseRepository,
  SimpleFinders,
  MultiFinders,
  RowOf,
  RepositoryOptions,
  ComparisonOperator,
  ParsedColumn,
  ParsedMethod,
  QueryOptions,
  CreateManyOptions,
  CreateManyCountResult,
  RawBuilder,
  SelectQueryBuilder,
  Selectable,
  Insertable,
  Updateable,
} from './infrastructure/repository';

// Database
export {
  createDatabase,
  checkDatabaseHealth,
  createLoggingPlugin,
  consoleLogger,
  withTransaction,
} from './infrastructure/database';
export type {
  DatabaseConfig,
  HealthCheckResult,
  LogLevel,
  QueryLogEvent,
  QueryLogger,
  TransactionScope,
} from './infrastructure/database';

// Errors
export { RepositoryError } from './shared/errors/repository-error';
export type { RepositoryErrorCode } from './shared/errors/repository-error';
