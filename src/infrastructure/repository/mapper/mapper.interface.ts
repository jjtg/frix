import type { Insertable } from 'kysely';

/**
 * Mapper interface for converting between database rows and DTOs.
 *
 * @template TRow - Database row type
 * @template TDto - DTO (Data Transfer Object) type
 *
 * @example
 * ```typescript
 * const mapper: Mapper<UserRow, UserDTO> = {
 *   toDto: (row) => ({ id: row.id, userName: row.user_name }),
 *   toRow: (dto) => ({ id: dto.id, user_name: dto.userName })
 * };
 * ```
 */
export interface Mapper<TRow, TDto> {
  /**
   * Convert database row to DTO.
   *
   * @param row - Database row
   * @returns DTO instance or plain object
   */
  toDto(row: TRow): TDto;

  /**
   * Convert DTO to insertable database row.
   *
   * @param dto - DTO instance or plain object
   * @returns Database row format
   */
  toRow(dto: TDto): Insertable<TRow>;
}
