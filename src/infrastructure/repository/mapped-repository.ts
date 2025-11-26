import type { Insertable } from 'kysely';
import { toSnakeCase } from './mapper/utils';
import type {
  CreateManyCountResult,
  CreateManyOptions,
  MappedRepository,
  Repository,
  Transformer,
} from './types';

/**
 * Convert criteria keys from DTO format (camelCase) to Row format (snake_case).
 * This allows users to pass DTO-style criteria to count/exists methods.
 *
 * @param criteria - Object with camelCase keys
 * @returns Object with snake_case keys
 */
function convertCriteriaKeys<T>(criteria: T): Record<string, unknown> {
  if (!criteria || typeof criteria !== 'object') {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(criteria)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

// biome-ignore lint/suspicious/noExplicitAny: Method handlers need flexible typing for repository methods
type MethodHandler<Row, TDto> = (target: any, value: any, mapper: Transformer<Row, TDto>) => any;

/**
 * Create method handlers for mapped repository methods.
 * Each handler wraps a repository method to transform between Row and DTO.
 */
function createMethodHandlers<Row, TDto>(): Record<string, MethodHandler<Row, TDto>> {
  return {
    findAll: (target, value, mapper) => async (): Promise<TDto[]> => {
      const rows = (await value.call(target)) as Row[];
      return rows.map((row) => mapper.toDto(row));
    },

    findById:
      (target, value, mapper) =>
      async (id: unknown): Promise<TDto | null> => {
        const row = (await value.call(target, id)) as Row | null;
        return row === null ? null : mapper.toDto(row);
      },

    create:
      (target, value, mapper) =>
      async (data: unknown): Promise<TDto> => {
        const rowData = mapper.toRow(data as TDto);
        const row = (await value.call(target, rowData)) as Row;
        return mapper.toDto(row);
      },

    update:
      (target, value, mapper) =>
      async (id: unknown, data: unknown): Promise<TDto | null> => {
        const partialRowData = mapper.toRow(data as TDto) as Insertable<Row>;
        const row = (await value.call(target, id, partialRowData)) as Row | null;
        return row === null ? null : mapper.toDto(row);
      },

    save:
      (target, value, mapper) =>
      async (data: unknown): Promise<TDto> => {
        const rowData = mapper.toRow(data as TDto);
        const row = (await value.call(target, rowData)) as Row;
        return mapper.toDto(row);
      },

    createMany:
      (target, value, mapper) =>
      async (
        data: unknown[],
        options?: CreateManyOptions
      ): Promise<TDto[] | CreateManyCountResult> => {
        const rowsData = data.map((d) => mapper.toRow(d as TDto));
        const result = await value.call(target, rowsData, options);
        if (options?.skipReturn) {
          return result as CreateManyCountResult;
        }
        return (result as Row[]).map((row) => mapper.toDto(row));
      },

    updateMany:
      (target, value, mapper) =>
      async (criteria: unknown, data: unknown): Promise<number> => {
        const rowCriteria = convertCriteriaKeys(criteria);
        const rowData = mapper.toRow(data as TDto);
        return value.call(target, rowCriteria, rowData) as Promise<number>;
      },

    deleteMany:
      (target, value) =>
      async (criteria: unknown): Promise<number> => {
        const rowCriteria = convertCriteriaKeys(criteria);
        return value.call(target, rowCriteria) as Promise<number>;
      },

    count:
      (target, value) =>
      async (criteria?: unknown): Promise<number> => {
        const rowCriteria = criteria ? convertCriteriaKeys(criteria) : undefined;
        return value.call(target, rowCriteria) as Promise<number>;
      },

    exists:
      (target, value) =>
      async (criteria?: unknown): Promise<boolean> => {
        const rowCriteria = criteria ? convertCriteriaKeys(criteria) : undefined;
        return value.call(target, rowCriteria) as Promise<boolean>;
      },
  };
}

/**
 * Handle dynamic finder methods (findBy*, findAllBy*).
 */
function handleDynamicFinder<Row, TDto>(
  methodName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic method calls require flexible typing
  target: any,
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic method calls require flexible typing
  value: any,
  mapper: Transformer<Row, TDto>
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic method return types vary
): any | null {
  if (methodName.startsWith('findAllBy')) {
    return async (...args: unknown[]): Promise<TDto[]> => {
      const rows = (await value.apply(target, args)) as Row[];
      return rows.map((row) => mapper.toDto(row));
    };
  }

  if (methodName.startsWith('findBy')) {
    return async (...args: unknown[]): Promise<TDto | null> => {
      const row = (await value.apply(target, args)) as Row | null;
      return row === null ? null : mapper.toDto(row);
    };
  }

  return null;
}

/**
 * Creates a MappedRepository proxy that wraps an existing repository
 * and automatically transforms data between Row and DTO formats.
 *
 * @template DB - Database schema type
 * @template TName - Table name
 * @template Row - Database row type
 * @template IdKey - Primary key column name
 * @template TDto - DTO type
 *
 * @param repository - The underlying repository to wrap
 * @param mapper - Transformer with toDto/toRow functions
 * @returns MappedRepository that transforms all operations
 */
export function createMappedRepository<
  DB,
  TName extends keyof DB & string,
  Row,
  IdKey extends keyof Row & string,
  TDto,
>(
  repository: Repository<DB, TName, Row, IdKey>,
  mapper: Transformer<Row, TDto>
): MappedRepository<DB, TName, Row, IdKey, TDto> {
  const passThroughMethods = new Set(['delete', 'query']);
  const methodHandlers = createMethodHandlers<Row, TDto>();

  const handler: ProxyHandler<Repository<DB, TName, Row, IdKey>> = {
    get(target, prop, _receiver) {
      // Handle 'raw' property - return underlying repository
      if (prop === 'raw') {
        return target;
      }

      // Handle 'rawQuery' - map to underlying 'raw' method
      if (prop === 'rawQuery') {
        return Reflect.get(target, 'raw').bind(target);
      }

      const value = Reflect.get(target, prop);

      if (typeof value !== 'function') {
        return value;
      }

      const methodName = String(prop);

      // Pass-through methods
      if (passThroughMethods.has(methodName)) {
        return value.bind(target);
      }

      // Check for registered method handler
      const methodHandler = methodHandlers[methodName];
      if (methodHandler) {
        return methodHandler(target, value, mapper);
      }

      // Check for dynamic finders
      const dynamicHandler = handleDynamicFinder(methodName, target, value, mapper);
      if (dynamicHandler) {
        return dynamicHandler;
      }

      // For any other methods, pass through
      return value.bind(target);
    },
  };

  return new Proxy(repository, handler) as unknown as MappedRepository<DB, TName, Row, IdKey, TDto>;
}
