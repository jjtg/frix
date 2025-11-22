import type { Kysely } from 'kysely';
import { createRepository } from 'frix';
import type { Database, UserTable } from '../types.js';

interface IUserRepository {
  // Multi-column finders
  findByEmailAndStatus(email: string, status: string): Promise<UserTable | undefined>;

  // Comparison operators
  findAllByIdGreaterThan(id: number): Promise<UserTable[]>;
  findAllByStatusIn(statuses: string[]): Promise<UserTable[]>;
  findAllByEmailLike(pattern: string): Promise<UserTable[]>;

  // Ordering
  findAllByStatusOrderByNameAsc(status: string): Promise<UserTable[]>;
  findAllByStatusOrderByNameDesc(status: string): Promise<UserTable[]>;

  // Pagination (override base method to accept options)
  findAllByStatus(status: string, options?: { limit?: number; offset?: number }): Promise<UserTable[]>;
}

export function createUserRepository(db: Kysely<Database>) {
  const repo = createRepository(db, 'users');

  return repo as typeof repo & IUserRepository;
}

export type UserRepository = ReturnType<typeof createUserRepository>;
