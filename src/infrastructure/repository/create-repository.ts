import type { Kysely, RawBuilder, SelectQueryBuilder } from 'kysely';
import { sql } from 'kysely';
import { RepositoryError } from '../../shared/errors/repository-error';
import { parseFinderMethod } from './parser';
import type {
  ComparisonOperator,
  CreateManyCountResult,
  CreateManyOptions,
  ParsedMethod,
  QueryOptions,
  Repository,
  RepositoryOptions,
  RowOf,
} from './types';

const DEFAULT_CHUNK_SIZE = 1000;

// Chunk array into batches
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Apply criteria as WHERE clauses to a query
function applyCriteria<Q extends { where: (key: never, op: string, value: never) => Q }>(
  query: Q,
  criteria: Record<string, unknown>
): Q {
  let result = query;
  for (const [key, value] of Object.entries(criteria)) {
    result = result.where(key as never, '=', value as never);
  }
  return result;
}

// Cache for parsed method names
const methodCache = new Map<string, ParsedMethod>();

function getCachedMethod(methodName: string): ParsedMethod {
  let parsed = methodCache.get(methodName);
  if (!parsed) {
    parsed = parseFinderMethod(methodName);
    methodCache.set(methodName, parsed);
  }
  return parsed;
}

// Map comparison operators to SQL operators
const OPERATOR_MAP: Record<ComparisonOperator, string> = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'in',
  like: 'like',
  isNull: 'is',
  isNotNull: 'is not',
};

// Check if a value looks like QueryOptions
function isQueryOptions(value: unknown): value is QueryOptions {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    ('limit' in obj && (typeof obj.limit === 'number' || obj.limit === undefined)) ||
    ('offset' in obj && (typeof obj.offset === 'number' || obj.offset === undefined))
  );
}

// Extract options from args if present
function extractOptions(
  args: unknown[],
  isMultiple: boolean
): { options: QueryOptions | undefined; values: unknown[] } {
  if (isMultiple && args.length > 0 && isQueryOptions(args[args.length - 1])) {
    return {
      options: args[args.length - 1] as QueryOptions,
      values: args.slice(0, -1),
    };
  }
  return { options: undefined, values: args };
}

// Apply where clauses to query
function applyWhereClausesGeneric<T>(
  query: T,
  parsed: ParsedMethod,
  values: unknown[],
  operatorMap: Record<ComparisonOperator, string>
): T {
  let result = query;
  let valueIndex = 0;

  for (const col of parsed.columns) {
    const operator = operatorMap[col.comparison];

    if (col.comparison === 'isNull' || col.comparison === 'isNotNull') {
      result = (result as { where: (...args: unknown[]) => T }).where(
        col.name as never,
        operator as never,
        null as never
      );
    } else {
      result = (result as { where: (...args: unknown[]) => T }).where(
        col.name as never,
        operator as never,
        values[valueIndex] as never
      );
      valueIndex++;
    }
  }

  return result;
}

// Create a finder function for dynamic methods
function createFinderFunction<DB, TName extends keyof DB & string, Row>(
  db: Kysely<DB>,
  tableName: TName,
  parsed: ParsedMethod,
  isMultiple: boolean,
  expectedArgs: number,
  methodName: string
): (...args: unknown[]) => Promise<Row[] | Row | null> {
  return async (...args: unknown[]): Promise<Row[] | Row | null> => {
    const { options, values } = extractOptions(args, isMultiple);

    if (values.length !== expectedArgs) {
      throw new RepositoryError(
        `Method ${methodName} expects ${expectedArgs} argument(s), but got ${values.length}`,
        'ARGUMENT_COUNT_MISMATCH',
        { methodName, expected: expectedArgs, received: values.length }
      );
    }

    let query = applyWhereClausesGeneric(
      db.selectFrom(tableName).selectAll(),
      parsed,
      values,
      OPERATOR_MAP
    );

    if (parsed.orderBy) {
      query = query.orderBy(parsed.orderBy.column as never, parsed.orderBy.direction);
    }

    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      query = query.offset(options.offset);
    }

    if (isMultiple) {
      return query.execute() as Promise<Row[]>;
    }
    const result = await query.executeTakeFirst();
    return (result ?? null) as Row | null;
  };
}

/**
 * Creates a repository with auto-generated finder methods for a database table.
 *
 * The repository provides CRUD operations and dynamically generates finder methods
 * based on method names at runtime using a Proxy.
 *
 * @template DB - The database schema type
 * @template TName - The table name (must be a key of DB)
 * @template Row - The row type (defaults to the table's row type)
 * @template IdKey - The primary key column name (defaults to 'id')
 *
 * @param db - The Kysely database instance
 * @param tableName - The name of the table to create a repository for
 * @param options - Optional configuration (e.g., custom id column)
 *
 * @returns A repository instance with CRUD operations and auto-generated finders
 *
 * @throws {RepositoryError} INVALID_ARGUMENT - If db or tableName is invalid
 *
 * @example
 * ```typescript
 * const userRepo = createRepository(db, 'users');
 *
 * // Basic CRUD
 * const user = await userRepo.create({ email: 'test@example.com', name: 'Test' });
 * const found = await userRepo.findById(user.id);
 * await userRepo.update(user.id, { name: 'Updated' });
 * await userRepo.delete(user.id);
 *
 * // Auto-generated finders
 * const byEmail = await userRepo.findByEmail('test@example.com');
 * const activeUsers = await userRepo.findAllByStatus('ACTIVE');
 * const sorted = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');
 * ```
 */
export function createRepository<
  DB,
  TName extends keyof DB & string,
  Row = RowOf<DB, TName>,
  IdKey extends keyof Row & string = 'id' extends keyof Row & string ? 'id' : never,
>(
  db: Kysely<DB>,
  tableName: TName,
  options?: RepositoryOptions<IdKey>
): Repository<DB, TName, Row, IdKey> {
  // Input validation
  if (!db) {
    throw new RepositoryError(
      'Invalid argument: db is required and cannot be null or undefined',
      'INVALID_ARGUMENT',
      { argument: 'db' }
    );
  }

  if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
    throw new RepositoryError(
      'Invalid argument: tableName must be a non-empty string',
      'INVALID_ARGUMENT',
      { argument: 'tableName', value: tableName }
    );
  }

  const idColumn = (options?.idColumn ?? 'id') as string;

  // Base methods
  const base = {
    async findAll(): Promise<Row[]> {
      return db.selectFrom(tableName).selectAll().execute() as Promise<Row[]>;
    },

    async findById(id: unknown): Promise<Row | null> {
      const result = await db
        .selectFrom(tableName)
        .selectAll()
        .where(idColumn as never, '=', id as never)
        .executeTakeFirst();
      return (result ?? null) as Row | null;
    },

    async create(data: unknown): Promise<Row> {
      return db
        .insertInto(tableName)
        .values(data as never)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<Row>;
    },

    async update(id: unknown, data: unknown): Promise<Row | null> {
      const result = await db
        .updateTable(tableName)
        .set(data as never)
        .where(idColumn as never, '=', id as never)
        .returningAll()
        .executeTakeFirst();
      return (result ?? null) as Row | null;
    },

    async delete(id: unknown): Promise<boolean> {
      const result = await db
        .deleteFrom(tableName)
        .where(idColumn as never, '=', id as never)
        .executeTakeFirst();

      return result.numDeletedRows > 0n;
    },

    async save(data: unknown): Promise<Row> {
      const record = data as Record<string, unknown>;

      // If no ID field, just insert
      if (!(idColumn in record)) {
        return base.create(data);
      }

      // Upsert with ON CONFLICT
      return db
        .insertInto(tableName)
        .values(data as never)
        .onConflict((oc) => oc.column(idColumn as never).doUpdateSet(data as never))
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<Row>;
    },

    async createMany(
      data: unknown[],
      options?: CreateManyOptions
    ): Promise<Row[] | CreateManyCountResult> {
      if (data.length === 0) {
        return options?.skipReturn ? { count: 0 } : [];
      }

      const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
      const chunks = chunk(data, chunkSize);

      if (options?.skipReturn) {
        const results = await Promise.all(
          chunks.map((batch) =>
            db
              .insertInto(tableName)
              .values(batch as never)
              .execute()
          )
        );
        const count = results.reduce((sum, result) => {
          const insertResult = result as unknown as { numInsertedOrUpdatedRows?: bigint }[];
          return sum + Number(insertResult[0]?.numInsertedOrUpdatedRows ?? 0);
        }, 0);
        return { count };
      }

      const results = await Promise.all(
        chunks.map((batch) =>
          db
            .insertInto(tableName)
            .values(batch as never)
            .returningAll()
            .execute()
        )
      );
      return results.flat() as Row[];
    },

    async updateMany(criteria: unknown, data: unknown): Promise<number> {
      const query = applyCriteria(
        db.updateTable(tableName).set(data as never),
        criteria as Record<string, unknown>
      );
      const result = await query.executeTakeFirst();
      return Number((result as { numUpdatedRows?: bigint }).numUpdatedRows ?? 0);
    },

    async deleteMany(criteria: unknown): Promise<number> {
      const query = applyCriteria(db.deleteFrom(tableName), criteria as Record<string, unknown>);
      const result = await query.executeTakeFirst();
      return Number(result.numDeletedRows ?? 0);
    },

    query(): SelectQueryBuilder<DB, TName, Row> {
      return db.selectFrom(tableName).selectAll() as SelectQueryBuilder<DB, TName, Row>;
    },

    async raw<T>(rawBuilder: RawBuilder<T>): Promise<T[]> {
      return rawBuilder.execute(db) as unknown as Promise<T[]>;
    },

    async count(criteria?: unknown): Promise<number> {
      let query = db
        .selectFrom(tableName)
        .select(db.fn.count<number>(idColumn as never).as('count'));

      if (criteria) {
        query = applyCriteria(query, criteria as Record<string, unknown>);
      }

      const result = await query.executeTakeFirstOrThrow();
      return Number((result as { count: number }).count);
    },

    async exists(criteria?: unknown): Promise<boolean> {
      let query = db.selectFrom(tableName).select(sql<number>`1`.as('exists'));

      if (criteria) {
        query = applyCriteria(query, criteria as Record<string, unknown>);
      }

      const result = await query.limit(1).executeTakeFirst();
      return result !== undefined;
    },
  };

  // Proxy handler for dynamic methods
  const handler: ProxyHandler<typeof base> = {
    get(target, prop, receiver) {
      // Return base methods if they exist
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      // Only handle string properties
      if (typeof prop !== 'string') {
        return undefined;
      }

      // Handle finder methods
      if (prop.startsWith('findAllBy') || prop.startsWith('findBy')) {
        const parsed = getCachedMethod(prop);
        const isMultiple = parsed.prefix === 'findAllBy';

        // Calculate expected argument count (skip isNull/isNotNull)
        const expectedArgs = parsed.columns.filter(
          (c) => c.comparison !== 'isNull' && c.comparison !== 'isNotNull'
        ).length;

        return createFinderFunction(db, tableName, parsed, isMultiple, expectedArgs, prop);
      }

      // Unknown method
      throw new RepositoryError(
        `Method ${prop} is not implemented on repository for ${tableName}`,
        'METHOD_NOT_IMPLEMENTED',
        { methodName: prop, tableName }
      );
    },
  };

  return new Proxy(base, handler) as unknown as Repository<DB, TName, Row, IdKey>;
}
