import type { Kysely } from 'kysely';
import { createRepository } from 'frix';
import type { Database, User } from '../types.js';

// ============================================================================
// TYPE-SAFE COMPLEX QUERIES with .extend<T>()
// ============================================================================

/**
 * Define complex query method signatures that Frix will auto-implement.
 *
 * Frix parses method names following the pattern:
 * - findBy{Column}          → Returns single result or undefined
 * - findAllBy{Column}       → Returns array of results
 * - {Column}And{Column}     → Multi-column conditions (AND)
 * - {Column}GreaterThan     → Comparison operators
 * - {Column}LessThan        → Comparison operators
 * - {Column}In              → IN operator (array parameter)
 * - {Column}Like            → LIKE operator (pattern matching)
 * - {Column}IsNull          → IS NULL check
 * - OrderBy{Column}Asc/Desc → Ordering
 *
 * The return types use the unwrapped User type (not UserTable with Generated<T>).
 */
interface UserQueries {
  // Multi-column finders
  findByEmailAndStatus(email: string, status: string): Promise<User | undefined>;

  // Comparison operators
  findAllByIdGreaterThan(id: number): Promise<User[]>;
  findAllByStatusIn(statuses: string[]): Promise<User[]>;
  findAllByEmailLike(pattern: string): Promise<User[]>;

  // Ordering
  findAllByStatusOrderByNameAsc(status: string): Promise<User[]>;
  findAllByStatusOrderByNameDesc(status: string): Promise<User[]>;

  // Pagination (accepts options object)
  findAllByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<User[]>;
}

/**
 * Creates a type-safe user repository using the .extend<T>() pattern.
 *
 * The .extend<T>() method:
 * 1. Accepts an interface defining additional query methods
 * 2. Auto-implements those methods based on naming conventions
 * 3. Returns a fully typed repository with both base and extended methods
 *
 * @example
 * ```typescript
 * const userRepo = createUserRepository(db);
 *
 * // All methods are fully typed with autocomplete:
 * const user = await userRepo.findByEmailAndStatus('a@b.com', 'ACTIVE');
 * const users = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');
 * ```
 */
export function createUserRepository(db: Kysely<Database>) {
  return createRepository(db, 'users').extend<UserQueries>();
}

export type UserRepository = ReturnType<typeof createUserRepository>;
