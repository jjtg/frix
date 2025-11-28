// Repository
export {
  createRepository,
  parseFinderColumns,
  parseFinderMethod,
} from './infrastructure/repository';
export type {
  Repository,
  ExtendableRepository,
  MappedRepository,
  MappedRepositoryWithQueries,
  MappedSimpleFinders,
  MappedMultiFinders,
  MapQueryReturnTypes,
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
  Transformer,
  MappedInsertable,
  RawBuilder,
  SelectQueryBuilder,
  Selectable,
  Insertable,
  Updateable,
  Unwrap,
  UnwrapRow,
} from './infrastructure/repository';

// Mappers
export {
  AutoMapper,
  CustomMapper,
  convertObjectKeys,
  toCamelCase,
  toSnakeCase,
} from './infrastructure/repository/mapper';
export type { Mapper } from './infrastructure/repository/mapper';

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
