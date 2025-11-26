import type {
  ColumnType,
  Insertable,
  RawBuilder,
  SelectQueryBuilder,
  Selectable,
  Updateable,
} from 'kysely';

/** Extract row type from DB schema */
export type RowOf<DB, TName extends keyof DB> = DB[TName];

/**
 * Unwrap Kysely types to their primitive "select" form.
 *
 * Extracts the underlying type from Kysely's ColumnType and Generated wrappers:
 * - Generated<T> → T
 * - ColumnType<Select, Insert, Update> → Select
 * - Primitive types → unchanged
 *
 * @template T - The type to unwrap
 *
 * @example
 * ```typescript
 * Unwrap<Generated<number>>                      // => number
 * Unwrap<ColumnType<Date, string, never>>        // => Date
 * Unwrap<string>                                 // => string
 * Unwrap<number | null>                          // => number | null
 * ```
 */
export type Unwrap<T> = T extends ColumnType<infer S, unknown, unknown> ? S : T;

/**
 * Unwrap all fields in a database row type.
 *
 * Recursively unwraps ColumnType/Generated fields to their select types,
 * making the row type match what you receive from SELECT queries.
 *
 * @template Row - The database row type to unwrap
 *
 * @example
 * ```typescript
 * interface UserTable {
 *   id: Generated<number>;
 *   email: string;
 *   created_at: Generated<Date>;
 * }
 *
 * type UnwrappedUser = UnwrapRow<UserTable>;
 * // => { id: number; email: string; created_at: Date }
 * ```
 */
export type UnwrapRow<Row> = {
  [K in keyof Row]: Unwrap<Row[K]>;
};

/** Re-export Kysely utility types for user convenience */
export type { Insertable, Selectable, Updateable };

/** Capitalize first letter */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/**
 * Convert snake_case to CamelCase for method names.
 * Recursively splits on underscores and capitalizes each segment.
 *
 * @example
 * SnakeToCamelCase<'user_id'> => 'UserId'
 * SnakeToCamelCase<'kyc_status'> => 'KycStatus'
 * SnakeToCamelCase<'api_v2_key'> => 'ApiV2Key'
 * SnakeToCamelCase<'status'> => 'Status'
 */
export type SnakeToCamelCase<S extends string> = S extends `${infer First}_${infer Rest}`
  ? `${Capitalize<First>}${SnakeToCamelCase<Rest>}`
  : Capitalize<S>;

/** Base repository methods */
export type BaseRepository<Row, IdKey extends keyof Row = 'id' extends keyof Row ? 'id' : never> = {
  findAll(): Promise<UnwrapRow<Row>[]>;
  findById(id: Unwrap<Row[IdKey]>): Promise<UnwrapRow<Row> | null>;
  create(data: Insertable<Row>): Promise<UnwrapRow<Row>>;
  update(id: Unwrap<Row[IdKey]>, data: Updateable<Row>): Promise<UnwrapRow<Row> | null>;
  delete(id: Unwrap<Row[IdKey]>): Promise<boolean>;
  save(data: Insertable<Row>): Promise<UnwrapRow<Row>>;
};

/** Batch operations */
export type BatchOperations<Row> = {
  createMany(
    data: Array<Insertable<Row>>,
    options?: CreateManyOptions & { skipReturn?: false }
  ): Promise<UnwrapRow<Row>[]>;
  createMany(
    data: Array<Insertable<Row>>,
    options: CreateManyOptions & { skipReturn: true }
  ): Promise<CreateManyCountResult>;
  createMany(
    data: Array<Insertable<Row>>,
    options?: CreateManyOptions
  ): Promise<UnwrapRow<Row>[] | CreateManyCountResult>;
  updateMany(criteria: Partial<UnwrapRow<Row>>, data: Updateable<Row>): Promise<number>;
  deleteMany(criteria: Partial<UnwrapRow<Row>>): Promise<number>;
};

/** Utility methods */
export type UtilityMethods<Row> = {
  count(criteria?: Partial<UnwrapRow<Row>>): Promise<number>;
  exists(criteria?: Partial<UnwrapRow<Row>>): Promise<boolean>;
};

/** Query builder methods */
export type QueryBuilderMethods<DB, TName extends keyof DB & string, Row> = {
  query(): SelectQueryBuilder<DB, TName, Row>;
  raw<T>(rawBuilder: RawBuilder<T>): Promise<T[]>;
};

/** Auto-generated single-column finders (returns single result) */
export type SimpleFinders<Row> = {
  [K in keyof Row & string as `findBy${SnakeToCamelCase<K>}`]: (
    value: Unwrap<Row[K]>
  ) => Promise<UnwrapRow<Row> | null>;
};

/** Auto-generated multi-result finders (returns array) */
export type MultiFinders<Row> = {
  [K in keyof Row & string as `findAllBy${SnakeToCamelCase<K>}`]: (
    value: Unwrap<Row[K]>
  ) => Promise<UnwrapRow<Row>[]>;
};

/** Combined repository type */
export type Repository<
  DB,
  TName extends keyof DB & string,
  Row = RowOf<DB, TName>,
  IdKey extends keyof Row & string = 'id' extends keyof Row & string ? 'id' : never,
> = BaseRepository<Row, IdKey> &
  BatchOperations<Row> &
  UtilityMethods<Row> &
  QueryBuilderMethods<DB, TName, Row> &
  SimpleFinders<Row> &
  MultiFinders<Row>;

/**
 * Repository with extend capability for adding typed complex queries.
 *
 * Use `.extend<Queries>()` to add type-safe complex query methods like
 * multi-column finders, ordering, and comparison operators.
 *
 * @template DB - Database schema type
 * @template TName - Table name
 * @template Row - Row type (defaults to table's row type)
 * @template IdKey - Primary key column name
 *
 * @example
 * ```typescript
 * interface UserQueries {
 *   findByEmailAndStatus(email: string, status: string): Promise<User | null>;
 *   findAllByStatusOrderByNameAsc(status: string): Promise<User[]>;
 * }
 *
 * const userRepo = createRepository(db, 'users').extend<UserQueries>();
 * const user = await userRepo.findByEmailAndStatus('alice@example.com', 'ACTIVE');
 * ```
 */
export type ExtendableRepository<
  DB,
  TName extends keyof DB & string,
  Row = RowOf<DB, TName>,
  IdKey extends keyof Row & string = 'id' extends keyof Row & string ? 'id' : never,
> = Repository<DB, TName, Row, IdKey> & {
  /**
   * Extends the repository with additional typed query methods.
   *
   * @template Queries - Interface defining complex query method signatures
   * @returns Repository with base methods and custom query methods
   */
  extend<Queries extends object>(): Repository<DB, TName, Row, IdKey> & Queries;
};

/** Factory options */
export interface RepositoryOptions<IdKey extends string> {
  idColumn?: IdKey;
}

/** Comparison operators for derived finders */
export type ComparisonOperator =
  | 'eq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'like'
  | 'isNull'
  | 'isNotNull';

/** Parsed column with its comparison */
export interface ParsedColumn {
  name: string;
  comparison: ComparisonOperator;
}

/** Parsed method structure */
export interface ParsedMethod {
  prefix: 'findBy' | 'findAllBy';
  columns: ParsedColumn[];
  orderBy?: {
    column: string;
    direction: 'asc' | 'desc';
  };
}

/** Query options for pagination */
export interface QueryOptions {
  limit?: number;
  offset?: number;
}

/** Options for batch create operations */
export interface CreateManyOptions {
  /** Chunk size for batching (default: 1000) */
  chunkSize?: number;
  /** Skip returning rows, just return count (faster for large inserts) */
  skipReturn?: boolean;
}

/** Result of createMany with skipReturn: true */
export interface CreateManyCountResult {
  count: number;
}

/** Re-export Kysely types for query builder access */
export type { RawBuilder, SelectQueryBuilder };
