import { RepositoryError } from '../../shared/errors/repository-error';
import { toSnakeCase } from './mapper/utils';
import type { ComparisonOperator, ParsedColumn, ParsedMethod } from './types';

const FINDER_PREFIXES = ['findAllBy', 'findBy'] as const;

// Order matters: longer suffixes must come first
const COMPARISON_SUFFIXES = [
  'GreaterThanEqual',
  'LessThanEqual',
  'GreaterThan',
  'LessThan',
  'IsNotNull',
  'IsNull',
  'Like',
  'In',
] as const;

const COMPARISON_MAP: Record<(typeof COMPARISON_SUFFIXES)[number], ComparisonOperator> = {
  GreaterThanEqual: 'gte',
  LessThanEqual: 'lte',
  GreaterThan: 'gt',
  LessThan: 'lt',
  IsNotNull: 'isNotNull',
  IsNull: 'isNull',
  Like: 'like',
  In: 'in',
};

/**
 * Parses a finder method name into column names.
 *
 * Supports both `findBy` and `findAllBy` prefixes. Automatically converts
 * camelCase column names to snake_case.
 *
 * @param methodName - The finder method name to parse
 *
 * @returns Array of snake_case column names
 *
 * @throws {RepositoryError} INVALID_FINDER_NAME - If method name is invalid
 *
 * @example
 * ```typescript
 * parseFinderColumns('findByEmail') // ['email']
 * parseFinderColumns('findByEmailAndStatus') // ['email', 'status']
 * parseFinderColumns('findAllByUserId') // ['user_id']
 * ```
 */
export function parseFinderColumns(methodName: string): string[] {
  const prefix = FINDER_PREFIXES.find((p) => methodName.startsWith(p));

  if (!prefix) {
    throw new RepositoryError(
      `Invalid finder method name: ${methodName}. Must start with "findBy" or "findAllBy"`,
      'INVALID_FINDER_NAME',
      { methodName }
    );
  }

  const rest = methodName.slice(prefix.length);

  if (!rest) {
    throw new RepositoryError(
      `Invalid finder method name: ${methodName}. No column specified after "${prefix}"`,
      'INVALID_FINDER_NAME',
      { methodName }
    );
  }

  const parts = rest.split('And');

  return parts.map((part) => toSnakeCase(part));
}

/**
 * Parse a column part into name and comparison operator.
 */
function parseColumnPart(part: string): ParsedColumn {
  // Check for comparison suffix
  for (const suffix of COMPARISON_SUFFIXES) {
    if (part.endsWith(suffix)) {
      const name = part.slice(0, -suffix.length);
      return {
        name: toSnakeCase(name),
        comparison: COMPARISON_MAP[suffix],
      };
    }
  }

  // Default to equality comparison
  return {
    name: toSnakeCase(part),
    comparison: 'eq',
  };
}

/**
 * Parses a finder method name into a structured ParsedMethod object.
 *
 * Supports comparison operators (GreaterThan, LessThan, In, Like, IsNull, etc.)
 * and ordering (OrderByXAsc, OrderByXDesc).
 *
 * @param methodName - The finder method name to parse
 *
 * @returns Structured object with prefix, columns, and optional orderBy
 *
 * @throws {RepositoryError} INVALID_FINDER_NAME - If method name is invalid
 *
 * @example
 * ```typescript
 * parseFinderMethod('findByAgeGreaterThan')
 * // { prefix: 'findBy', columns: [{ name: 'age', comparison: 'gt' }] }
 *
 * parseFinderMethod('findAllByStatusOrderByNameDesc')
 * // { prefix: 'findAllBy', columns: [{ name: 'status', comparison: 'eq' }],
 * //   orderBy: { column: 'name', direction: 'desc' } }
 * ```
 */
export function parseFinderMethod(methodName: string): ParsedMethod {
  const prefix = FINDER_PREFIXES.find((p) => methodName.startsWith(p));

  if (!prefix) {
    throw new RepositoryError(
      `Invalid finder method name: ${methodName}. Must start with "findBy" or "findAllBy"`,
      'INVALID_FINDER_NAME',
      { methodName }
    );
  }

  let rest = methodName.slice(prefix.length);

  if (!rest) {
    throw new RepositoryError(
      `Invalid finder method name: ${methodName}. No column specified after "${prefix}"`,
      'INVALID_FINDER_NAME',
      { methodName }
    );
  }

  // Extract OrderBy clause if present
  let orderBy: ParsedMethod['orderBy'];
  const orderByIndex = rest.indexOf('OrderBy');

  if (orderByIndex !== -1) {
    const orderByPart = rest.slice(orderByIndex + 7); // Skip 'OrderBy'
    rest = rest.slice(0, orderByIndex);

    if (!orderByPart) {
      throw new RepositoryError(
        `Invalid finder method name: ${methodName}. No column specified after "OrderBy"`,
        'INVALID_FINDER_NAME',
        { methodName }
      );
    }

    // Check for Desc/Asc suffix
    let direction: 'asc' | 'desc' = 'asc';
    let orderColumn = orderByPart;

    if (orderByPart.endsWith('Desc')) {
      direction = 'desc';
      orderColumn = orderByPart.slice(0, -4);
    } else if (orderByPart.endsWith('Asc')) {
      orderColumn = orderByPart.slice(0, -3);
    }

    orderBy = {
      column: toSnakeCase(orderColumn),
      direction,
    };
  }

  // Check for empty columns part (e.g., findByOrderByName)
  if (!rest) {
    throw new RepositoryError(
      `Invalid finder method name: ${methodName}. No column specified before "OrderBy"`,
      'INVALID_FINDER_NAME',
      { methodName }
    );
  }

  // Split by And and parse each column
  const parts = rest.split('And');

  // Validate no empty parts (e.g., trailing And)
  if (parts.some((part) => !part)) {
    throw new RepositoryError(
      `Invalid finder method name: ${methodName}. Empty column name detected`,
      'INVALID_FINDER_NAME',
      { methodName }
    );
  }

  const columns = parts.map(parseColumnPart);

  return {
    prefix: prefix as 'findBy' | 'findAllBy',
    columns,
    ...(orderBy && { orderBy }),
  };
}
