import type { Insertable } from 'kysely';
import type { Mapper } from './mapper.interface';

/**
 * Custom mapper with explicit field mapping logic.
 * Use when DTO structure differs from automatic snake_case ↔ camelCase conventions.
 *
 * @template TRow - Database row type
 * @template TDto - DTO type
 *
 * @example
 * ```typescript
 * const mapper = new CustomMapper<UserRow, UserDTO>({
 *   toDto: (row) => ({
 *     id: row.id,
 *     fullName: `${row.first_name} ${row.last_name}`,
 *     isActive: row.status === 'ACTIVE'
 *   }),
 *   toRow: (dto) => ({
 *     id: dto.id,
 *     first_name: dto.fullName.split(' ')[0],
 *     last_name: dto.fullName.split(' ')[1],
 *     status: dto.isActive ? 'ACTIVE' : 'INACTIVE'
 *   })
 * });
 * ```
 */
export class CustomMapper<TRow, TDto> implements Mapper<TRow, TDto> {
  /**
   * Create a CustomMapper instance with explicit mapping functions.
   *
   * @param config - Configuration with toDto and toRow functions
   */
  constructor(
    private config: {
      /**
       * Convert database row to DTO.
       */
      toDto: (row: TRow) => TDto;
      /**
       * Convert DTO to database row.
       */
      toRow: (dto: TDto) => Insertable<TRow>;
    }
  ) {}

  /**
   * Convert database row to DTO using custom logic.
   *
   * @param row - Database row
   * @returns DTO
   */
  toDto(row: TRow): TDto {
    return this.config.toDto(row);
  }

  /**
   * Convert DTO to database row using custom logic.
   *
   * @param dto - DTO
   * @returns Database row
   */
  toRow(dto: TDto): Insertable<TRow> {
    return this.config.toRow(dto);
  }
}
