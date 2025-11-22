import type { Insertable, RawBuilder, SelectQueryBuilder, Selectable, Updateable } from 'kysely';

/** Extract row type from DB schema */
export type RowOf<DB, TName extends keyof DB> = DB[TName];

/** Re-export Kysely utility types for user convenience */
export type { Insertable, Selectable, Updateable };

/** Capitalize first letter */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/** Base repository methods */
export type BaseRepository<Row, IdKey extends keyof Row = 'id' extends keyof Row ? 'id' : never> = {
  findAll(): Promise<Row[]>;
  findById(id: Row[IdKey]): Promise<Row | null>;
  create(data: Omit<Row, IdKey>): Promise<Row>;
  update(id: Row[IdKey], data: Partial<Omit<Row, IdKey>>): Promise<Row | null>;
  delete(id: Row[IdKey]): Promise<boolean>;
  save(data: Row | Omit<Row, IdKey>): Promise<Row>;
};

/** Batch operations */
export type BatchOperations<Row, IdKey extends keyof Row> = {
  createMany(
    data: Array<Omit<Row, IdKey>>,
    options?: CreateManyOptions & { skipReturn?: false }
  ): Promise<Row[]>;
  createMany(
    data: Array<Omit<Row, IdKey>>,
    options: CreateManyOptions & { skipReturn: true }
  ): Promise<CreateManyCountResult>;
  createMany(
    data: Array<Omit<Row, IdKey>>,
    options?: CreateManyOptions
  ): Promise<Row[] | CreateManyCountResult>;
  updateMany(criteria: Partial<Row>, data: Partial<Omit<Row, IdKey>>): Promise<number>;
  deleteMany(criteria: Partial<Row>): Promise<number>;
};

/** Utility methods */
export type UtilityMethods<Row> = {
  count(criteria?: Partial<Row>): Promise<number>;
  exists(criteria?: Partial<Row>): Promise<boolean>;
};

/** Query builder methods */
export type QueryBuilderMethods<DB, TName extends keyof DB & string, Row> = {
  query(): SelectQueryBuilder<DB, TName, Row>;
  raw<T>(rawBuilder: RawBuilder<T>): Promise<T[]>;
};

/** Auto-generated single-column finders (returns single result) */
export type SimpleFinders<Row> = {
  [K in keyof Row & string as `findBy${Capitalize<K>}`]: (value: Row[K]) => Promise<Row | null>;
};

/** Auto-generated multi-result finders (returns array) */
export type MultiFinders<Row> = {
  [K in keyof Row & string as `findAllBy${Capitalize<K>}`]: (value: Row[K]) => Promise<Row[]>;
};

/** Combined repository type */
export type Repository<
  DB,
  TName extends keyof DB & string,
  Row = RowOf<DB, TName>,
  IdKey extends keyof Row & string = 'id' extends keyof Row & string ? 'id' : never,
> = BaseRepository<Row, IdKey> &
  BatchOperations<Row, IdKey> &
  UtilityMethods<Row> &
  QueryBuilderMethods<DB, TName, Row> &
  SimpleFinders<Row> &
  MultiFinders<Row>;

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
