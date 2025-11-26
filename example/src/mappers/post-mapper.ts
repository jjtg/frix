import { AutoMapper, CustomMapper } from 'frix';
import type { Post, PostDTO } from '../types.js';

// ============================================================================
// AutoMapper for Posts - Convention-based Mapping
// ============================================================================

/**
 * Post AutoMapper for snake_case <-> camelCase conversion.
 *
 * Converts:
 * - user_id    <-> userId
 * - created_at <-> createdAt
 */
export const postAutoMapper = new AutoMapper<Post, PostDTO>();

// ============================================================================
// CustomMapper Example - Post with Author Summary
// ============================================================================

/**
 * Extended post DTO that includes computed fields.
 */
export interface PostWithMetaDTO {
  id: number;
  title: string;
  excerpt: string;
  isPublished: boolean;
  authorId: number;
}

/**
 * CustomMapper that transforms posts into a summary format with computed fields.
 *
 * Use cases:
 * - Creating excerpts from full content
 * - Adding computed flags
 * - Flattening nested data
 */
export const postSummaryMapper = new CustomMapper<Post, PostWithMetaDTO>({
  toDto: (post) => ({
    id: post.id,
    title: post.title,
    excerpt: post.content ? post.content.substring(0, 100) + '...' : '',
    isPublished: post.published ?? false,
    authorId: post.user_id,
  }),
  toRow: (dto) => ({
    id: dto.id,
    user_id: dto.authorId,
    title: dto.title,
    content: dto.excerpt.replace('...', ''), // Best effort reverse
    published: dto.isPublished,
    created_at: undefined,
  }),
});

/**
 * Example usage:
 *
 * // Get posts with excerpts for list view
 * const posts = await postRepo.findAllByPublished(true);
 * const summaries = posts.map(p => postSummaryMapper.toDto(p));
 *
 * // API response with excerpts
 * res.json({
 *   posts: summaries.map(s => ({
 *     ...s,
 *     url: `/posts/${s.id}`
 *   }))
 * });
 */
