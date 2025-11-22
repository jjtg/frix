import type { Kysely } from 'kysely';
import { createRepository } from 'frix';
import type { Database, PostTable } from '../types.js';

interface IPostRepository {
  findAllByUserId(userId: number): Promise<PostTable[]>;
}

export function createPostRepository(db: Kysely<Database>) {
  const repo = createRepository(db, 'posts');

  return repo as typeof repo & IPostRepository;
}

export type PostRepository = ReturnType<typeof createPostRepository>;
