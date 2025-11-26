import type { Insertable } from 'kysely';
import type { Mapper } from './mapper.interface';
import { convertObjectKeys, toCamelCase, toSnakeCase } from './utils';

/**
 * Automatic mapper using snake_case ↔ camelCase conversion by convention.
 * Works without configuration - automatically converts keys between formats.
 *
 * @template TRow - Database row type (snake_case columns)
 * @template TDto - DTO type (camelCase properties)
 *
 * @example
 * ```typescript
 * // With class constructor
 * const mapper = new AutoMapper(UserDTO);
 * const dto = mapper.toDto(row); // Returns UserDTO instance
 *
 * // Without constructor (plain objects)
 * const mapper = new AutoMapper<UserRow, UserDTO>();
 * const dto = mapper.toDto(row); // Returns plain object
 * ```
 */
export class AutoMapper<TRow, TDto> implements Mapper<TRow, TDto> {
  /**
   * Create an AutoMapper instance.
   *
   * @param dtoConstructor - Optional constructor function for DTO class.
   *                        If provided, returns class instances.
   *                        If omitted, returns plain objects.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic mapper requires any for DTO constructor
  constructor(private dtoConstructor?: new (data: any) => TDto) {}

  /**
   * Convert database row to DTO.
   * Automatically converts snake_case keys to camelCase.
   *
   * @param row - Database row with snake_case keys
   * @returns DTO with camelCase keys (class instance or plain object)
   */
  toDto(row: TRow): TDto {
    const converted = convertObjectKeys(row, toCamelCase);

    if (this.dtoConstructor) {
      return new this.dtoConstructor(converted);
    }

    return converted as unknown as TDto;
  }

  /**
   * Convert DTO to insertable database row.
   * Automatically converts camelCase keys to snake_case.
   *
   * @param dto - DTO with camelCase keys
   * @returns Database row with snake_case keys
   */
  toRow(dto: TDto): Insertable<TRow> {
    return convertObjectKeys(dto, toSnakeCase) as Insertable<TRow>;
  }
}
