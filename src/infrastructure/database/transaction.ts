import type { Kysely, Transaction } from 'kysely';
import { createRepository } from '../repository';
import type { Repository } from '../repository';
import type { TransactionScope } from './types';

/**
 * Executes operations within a database transaction.
 *
 * All repository operations within the callback will be atomic - they either
 * all succeed or all fail together. Repositories obtained via `scope.getRepository()`
 * are cached for the duration of the transaction.
 *
 * @template DB - The database schema type
 * @template T - The return type of the callback
 *
 * @param db - The Kysely database instance
 * @param callback - Function containing transactional operations
 *
 * @returns The value returned by the callback
 *
 * @throws Rolls back the transaction and re-throws any error from the callback
 *
 * @example
 * ```typescript
 * await withTransaction(db, async (scope) => {
 *   const userRepo = scope.getRepository('users');
 *   const postRepo = scope.getRepository('posts');
 *
 *   const user = await userRepo.create({ email: 'test@example.com' });
 *   await postRepo.create({ user_id: user.id, title: 'First Post' });
 *   // Both operations commit together or roll back together
 * });
 * ```
 */
export async function withTransaction<DB, T>(
  db: Kysely<DB>,
  callback: (scope: TransactionScope<DB>) => Promise<T>
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    // Cache for lazily created repositories
    // Using Map<string, unknown> to avoid complex variance issues with Repository type
    const repoCache = new Map<string, unknown>();

    const scope: TransactionScope<DB> = {
      getRepository<TName extends keyof DB & string>(tableName: TName): Repository<DB, TName> {
        let repo = repoCache.get(tableName) as Repository<DB, TName> | undefined;
        if (!repo) {
          // Create repository using the transaction connection
          repo = createRepository(trx as unknown as Kysely<DB>, tableName);
          repoCache.set(tableName, repo);
        }
        return repo;
      },
      transaction: trx as Transaction<DB>,
    };

    return callback(scope);
  });
}
