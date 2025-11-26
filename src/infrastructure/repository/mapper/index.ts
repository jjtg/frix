/**
 * DTO Mapping Module
 *
 * Provides utilities for automatic and custom mapping between database rows and DTOs.
 *
 * @module mapper
 */

export type { Mapper } from './mapper.interface';
export { AutoMapper } from './auto-mapper';
export { CustomMapper } from './custom-mapper';
export { convertObjectKeys, toCamelCase, toSnakeCase } from './utils';
