import { AutoMapper, CustomMapper } from 'frix';
import type { User, UserDTO, UserSummaryDTO } from '../types.js';

// ============================================================================
// AutoMapper Example - Convention-based snake_case <-> camelCase
// ============================================================================

/**
 * AutoMapper automatically converts between snake_case (database) and
 * camelCase (DTO) field names based on naming conventions.
 *
 * Conversion rules:
 * - snake_case -> camelCase: user_name -> userName
 * - camelCase -> snake_case: userName -> user_name
 *
 * @example
 * ```typescript
 * const row = { id: 1, created_at: new Date() };
 * const dto = userAutoMapper.toDto(row);
 * // dto = { id: 1, createdAt: Date }
 *
 * const backToRow = userAutoMapper.toRow(dto);
 * // backToRow = { id: 1, created_at: Date }
 * ```
 */
export const userAutoMapper = new AutoMapper<User, UserDTO>();

/**
 * Example usage of AutoMapper:
 *
 * // Convert database row to DTO
 * const user = await userRepo.findById(1);
 * const userDto = userAutoMapper.toDto(user);
 *
 * // Convert DTO back to row for update
 * const updatedRow = userAutoMapper.toRow(userDto);
 * await userRepo.update(user.id, updatedRow);
 *
 * // Batch conversion (use map())
 * const users = await userRepo.findAll();
 * const userDtos = users.map(u => userAutoMapper.toDto(u));
 */

// ============================================================================
// CustomMapper Example - Custom Transformation Logic
// ============================================================================

/**
 * CustomMapper allows you to define custom transformation logic
 * when simple field renaming isn't sufficient.
 *
 * Use cases:
 * - Combining multiple fields into one
 * - Computing derived values
 * - Transforming data types
 * - Hiding internal fields from API responses
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'Alice', status: 'ACTIVE' };
 * const summary = userSummaryMapper.toDto(user);
 * // summary = { id: 1, displayName: 'Alice', isActive: true }
 * ```
 */
export const userSummaryMapper = new CustomMapper<User, UserSummaryDTO>({
  toDto: (user) => ({
    id: user.id,
    displayName: user.name,
    isActive: user.status === 'ACTIVE',
  }),
  toRow: (dto) => ({
    id: dto.id,
    email: '', // Not available in summary DTO - needs to be handled
    name: dto.displayName,
    status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
    created_at: undefined, // Will use default
  }),
});

/**
 * Example usage of CustomMapper:
 *
 * // Convert to summary DTO for list views
 * const users = await userRepo.findAllByStatus('ACTIVE');
 * const summaries = users.map(u => userSummaryMapper.toDto(u));
 *
 * // Return lightweight summaries in API response
 * res.json({ users: summaries });
 */
