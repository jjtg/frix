import type { Generated } from 'kysely';

/**
 * Database table definition for users.
 *
 * Represents a user account in the system with basic profile information
 * and account status.
 *
 * @example
 * ```typescript
 * const user: UserTable = {
 *   id: 1,
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   status: 'ACTIVE',
 *   created_at: new Date()
 * };
 * ```
 */
export interface UserTable {
  /** Auto-generated primary key */
  id: Generated<number>;
  /** User's email address (unique) */
  email: string;
  /** User's display name */
  name: string;
  /** Account status - ACTIVE or INACTIVE */
  status: 'ACTIVE' | 'INACTIVE';
  /** Timestamp when the user was created */
  created_at?: Generated<Date>;
}

/**
 * Database table definition for posts.
 *
 * Represents a blog post or article created by a user.
 *
 * @example
 * ```typescript
 * const post: PostTable = {
 *   id: 1,
 *   user_id: 1,
 *   title: 'My First Post',
 *   content: 'Hello, world!',
 *   published: true,
 *   created_at: new Date()
 * };
 * ```
 */
export interface PostTable {
  /** Auto-generated primary key */
  id: Generated<number>;
  /** Foreign key referencing users.id */
  user_id: number;
  /** Post title */
  title: string;
  /** Post content (nullable) */
  content: string | null;
  /** Whether the post is published (defaults to false) */
  published?: Generated<boolean>;
  /** Timestamp when the post was created */
  created_at?: Generated<Date>;
}

/**
 * Database schema definition for Kysely.
 *
 * Maps table names to their corresponding table interfaces.
 * Used to provide type safety for all database operations.
 *
 * @example
 * ```typescript
 * import { createDatabase } from 'frix';
 * import type { Database } from './types';
 *
 * const db = createDatabase<Database>({
 *   connectionString: 'postgresql://...'
 * });
 * ```
 */
export interface Database {
  /** Users table */
  users: UserTable;
  /** Posts table */
  posts: PostTable;
}
