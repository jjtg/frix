import type { Kysely } from 'kysely';
import { createRepository } from 'frix';
import type { Database, Post } from '../types.js';

/**
 * Post query extensions using the .extend<T>() pattern.
 */
interface PostQueries {
  findAllByUserId(userId: number): Promise<Post[]>;
  findAllByPublished(published: boolean): Promise<Post[]>;
  findAllByUserIdAndPublished(userId: number, published: boolean): Promise<Post[]>;
  findAllByUserIdOrderByCreatedAtDesc(userId: number): Promise<Post[]>;
}

/**
 * Creates a type-safe post repository using .extend<T>().
 */
export function createPostRepository(db: Kysely<Database>) {
  return createRepository(db, 'posts').extend<PostQueries>();
}

export type PostRepository = ReturnType<typeof createPostRepository>;
