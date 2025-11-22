import { describe, expect, it } from 'vitest';
import { RepositoryError } from '../../../../src';
import {
  parseFinderColumns,
  parseFinderMethod,
} from '../../../../src/infrastructure/repository/parser';

describe('parseFinderColumns', () => {
  describe('single column', () => {
    it('should parse findByEmail to ["email"]', () => {
      const result = parseFinderColumns('findByEmail');
      expect(result).toEqual(['email']);
    });

    it('should parse findById to ["id"]', () => {
      const result = parseFinderColumns('findById');
      expect(result).toEqual(['id']);
    });

    it('should parse findByStatus to ["status"]', () => {
      const result = parseFinderColumns('findByStatus');
      expect(result).toEqual(['status']);
    });
  });

  describe('multiple columns', () => {
    it('should parse findByEmailAndStatus to ["email", "status"]', () => {
      const result = parseFinderColumns('findByEmailAndStatus');
      expect(result).toEqual(['email', 'status']);
    });

    it('should parse findByFirstNameAndLastNameAndAge to ["first_name", "last_name", "age"]', () => {
      const result = parseFinderColumns('findByFirstNameAndLastNameAndAge');
      expect(result).toEqual(['first_name', 'last_name', 'age']);
    });
  });

  describe('edge cases', () => {
    it('should handle camelCase columns like findByCreatedAt', () => {
      const result = parseFinderColumns('findByCreatedAt');
      expect(result).toEqual(['created_at']);
    });

    it('should handle findByUserIdAndCreatedAt', () => {
      const result = parseFinderColumns('findByUserIdAndCreatedAt');
      expect(result).toEqual(['user_id', 'created_at']);
    });
  });

  describe('error conditions', () => {
    it('should throw INVALID_FINDER_NAME for findBy with no field', () => {
      expect(() => parseFinderColumns('findBy')).toThrow(RepositoryError);

      try {
        parseFinderColumns('findBy');
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        expect((error as RepositoryError).code).toBe('INVALID_FINDER_NAME');
      }
    });

    it('should throw INVALID_FINDER_NAME for empty string', () => {
      expect(() => parseFinderColumns('')).toThrow(RepositoryError);

      try {
        parseFinderColumns('');
      } catch (error) {
        expect((error as RepositoryError).code).toBe('INVALID_FINDER_NAME');
      }
    });

    it('should throw INVALID_FINDER_NAME for method not starting with findBy', () => {
      expect(() => parseFinderColumns('getByEmail')).toThrow(RepositoryError);

      try {
        parseFinderColumns('getByEmail');
      } catch (error) {
        expect((error as RepositoryError).code).toBe('INVALID_FINDER_NAME');
      }
    });
  });

  describe('findAllBy prefix', () => {
    it('should parse findAllByEmail to ["email"]', () => {
      const result = parseFinderColumns('findAllByEmail');
      expect(result).toEqual(['email']);
    });

    it('should parse findAllByStatus to ["status"]', () => {
      const result = parseFinderColumns('findAllByStatus');
      expect(result).toEqual(['status']);
    });

    it('should parse findAllByStatusAndRole to ["status", "role"]', () => {
      const result = parseFinderColumns('findAllByStatusAndRole');
      expect(result).toEqual(['status', 'role']);
    });

    it('should throw INVALID_FINDER_NAME for findAllBy with no field', () => {
      expect(() => parseFinderColumns('findAllBy')).toThrow(RepositoryError);
    });
  });
});

describe('parseFinderMethod', () => {
  describe('comparison operators', () => {
    it('should parse findByAgeGreaterThan', () => {
      const result = parseFinderMethod('findByAgeGreaterThan');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'age', comparison: 'gt' }],
      });
    });

    it('should parse findByPriceLessThanEqual', () => {
      const result = parseFinderMethod('findByPriceLessThanEqual');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'price', comparison: 'lte' }],
      });
    });

    it('should parse findByStatusIn', () => {
      const result = parseFinderMethod('findByStatusIn');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'status', comparison: 'in' }],
      });
    });

    it('should parse findByEmailLike', () => {
      const result = parseFinderMethod('findByEmailLike');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'email', comparison: 'like' }],
      });
    });

    it('should parse findByDeletedAtIsNull', () => {
      const result = parseFinderMethod('findByDeletedAtIsNull');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'deleted_at', comparison: 'isNull' }],
      });
    });

    it('should parse findByDeletedAtIsNotNull', () => {
      const result = parseFinderMethod('findByDeletedAtIsNotNull');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'deleted_at', comparison: 'isNotNull' }],
      });
    });

    it('should parse findByAgeGreaterThanAndStatus with mixed comparisons', () => {
      const result = parseFinderMethod('findByAgeGreaterThanAndStatus');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [
          { name: 'age', comparison: 'gt' },
          { name: 'status', comparison: 'eq' },
        ],
      });
    });

    it('should parse findByAgeLessThan', () => {
      const result = parseFinderMethod('findByAgeLessThan');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'age', comparison: 'lt' }],
      });
    });

    it('should parse findByAgeGreaterThanEqual', () => {
      const result = parseFinderMethod('findByAgeGreaterThanEqual');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'age', comparison: 'gte' }],
      });
    });
  });

  describe('ordering', () => {
    it('should parse findAllByStatusOrderByCreatedAt with default asc', () => {
      const result = parseFinderMethod('findAllByStatusOrderByCreatedAt');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'status', comparison: 'eq' }],
        orderBy: { column: 'created_at', direction: 'asc' },
      });
    });

    it('should parse findAllByStatusOrderByCreatedAtDesc', () => {
      const result = parseFinderMethod('findAllByStatusOrderByCreatedAtDesc');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'status', comparison: 'eq' }],
        orderBy: { column: 'created_at', direction: 'desc' },
      });
    });

    it('should parse findAllByStatusOrderByCreatedAtAsc', () => {
      const result = parseFinderMethod('findAllByStatusOrderByCreatedAtAsc');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'status', comparison: 'eq' }],
        orderBy: { column: 'created_at', direction: 'asc' },
      });
    });

    it('should parse complex query with comparison and ordering', () => {
      const result = parseFinderMethod('findAllByAgeGreaterThanOrderByNameDesc');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'age', comparison: 'gt' }],
        orderBy: { column: 'name', direction: 'desc' },
      });
    });
  });

  describe('backward compatibility', () => {
    it('should parse findByEmail with default eq comparison', () => {
      const result = parseFinderMethod('findByEmail');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'email', comparison: 'eq' }],
      });
    });

    it('should parse findAllByStatus with default eq comparison', () => {
      const result = parseFinderMethod('findAllByStatus');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'status', comparison: 'eq' }],
      });
    });

    it('should parse findByEmailAndStatus', () => {
      const result = parseFinderMethod('findByEmailAndStatus');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [
          { name: 'email', comparison: 'eq' },
          { name: 'status', comparison: 'eq' },
        ],
      });
    });
  });

  describe('error conditions', () => {
    it('should throw for findByOrderByName (no column before OrderBy)', () => {
      expect(() => parseFinderMethod('findByOrderByName')).toThrow(RepositoryError);
    });

    it('should throw for empty method name', () => {
      expect(() => parseFinderMethod('')).toThrow(RepositoryError);
    });

    it('should throw for invalid prefix', () => {
      expect(() => parseFinderMethod('getByEmail')).toThrow(RepositoryError);
    });
  });

  describe('leading uppercase sequences', () => {
    it('should convert XMLHttpRequest to xml_http_request', () => {
      const result = parseFinderMethod('findByXMLHttpRequest');
      expect(result.columns[0]?.name).toBe('xml_http_request');
    });

    it('should convert HTMLElement to html_element', () => {
      const result = parseFinderMethod('findByHTMLElement');
      expect(result.columns[0]?.name).toBe('html_element');
    });

    it('should convert IOError to io_error', () => {
      const result = parseFinderMethod('findByIOError');
      expect(result.columns[0]?.name).toBe('io_error');
    });

    it('should convert APIKey to api_key', () => {
      const result = parseFinderMethod('findByAPIKey');
      expect(result.columns[0]?.name).toBe('api_key');
    });

    it('should convert ID to id', () => {
      const result = parseFinderMethod('findByID');
      expect(result.columns[0]?.name).toBe('id');
    });

    it('should convert XMLParser to xml_parser', () => {
      const result = parseFinderMethod('findByXMLParser');
      expect(result.columns[0]?.name).toBe('xml_parser');
    });

    it('should convert getHTTPResponse to get_http_response', () => {
      const result = parseFinderMethod('findByGetHTTPResponse');
      expect(result.columns[0]?.name).toBe('get_http_response');
    });
  });

  describe('edge cases', () => {
    it('should handle method name with only prefix (findBy)', () => {
      expect(() => parseFinderMethod('findBy')).toThrow(RepositoryError);

      try {
        parseFinderMethod('findBy');
      } catch (error) {
        expect((error as RepositoryError).code).toBe('INVALID_FINDER_NAME');
      }
    });

    it('should handle method name with only prefix (findAllBy)', () => {
      expect(() => parseFinderMethod('findAllBy')).toThrow(RepositoryError);

      try {
        parseFinderMethod('findAllBy');
      } catch (error) {
        expect((error as RepositoryError).code).toBe('INVALID_FINDER_NAME');
      }
    });

    it('should handle column name with numbers', () => {
      const result = parseFinderMethod('findByField2Value');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'field2_value', comparison: 'eq' }],
      });
    });

    it('should handle very long method names', () => {
      const result = parseFinderMethod('findByFirstNameAndLastNameAndEmailAndStatusAndCreatedAt');
      expect(result.columns).toHaveLength(5);
      expect(result.columns[0]?.name).toBe('first_name');
      expect(result.columns[4]?.name).toBe('created_at');
    });

    it('should handle column ending with OrderBy keyword in name', () => {
      // Column named 'sortOrderBy' should work correctly
      const result = parseFinderMethod('findBySortOrder');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'sort_order', comparison: 'eq' }],
      });
    });

    it('should handle consecutive uppercase letters (like ID)', () => {
      const result = parseFinderMethod('findByUserID');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'user_id', comparison: 'eq' }],
      });
    });

    it('should handle single character column name', () => {
      const result = parseFinderMethod('findByX');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'x', comparison: 'eq' }],
      });
    });

    it('should throw for trailing And', () => {
      expect(() => parseFinderMethod('findByEmailAnd')).toThrow(RepositoryError);
    });
  });

  describe('snake_case column normalization', () => {
    it('should convert UserId to user_id', () => {
      const result = parseFinderMethod('findByUserId');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'user_id', comparison: 'eq' }],
      });
    });

    it('should convert CreatedAt to created_at', () => {
      const result = parseFinderMethod('findByCreatedAt');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'created_at', comparison: 'eq' }],
      });
    });

    it('should handle already snake_case input (backward compatible)', () => {
      const result = parseFinderMethod('findByUser_id');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'user_id', comparison: 'eq' }],
      });
    });

    it('should convert simple column names without change', () => {
      const result = parseFinderMethod('findByEmail');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [{ name: 'email', comparison: 'eq' }],
      });
    });

    it('should convert multi-column camelCase to snake_case', () => {
      const result = parseFinderMethod('findByUserIdAndCreatedAt');
      expect(result).toEqual({
        prefix: 'findBy',
        columns: [
          { name: 'user_id', comparison: 'eq' },
          { name: 'created_at', comparison: 'eq' },
        ],
      });
    });

    it('should convert orderBy column to snake_case', () => {
      const result = parseFinderMethod('findAllByStatusOrderByCreatedAtDesc');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'status', comparison: 'eq' }],
        orderBy: { column: 'created_at', direction: 'desc' },
      });
    });

    it('should convert comparison columns to snake_case', () => {
      const result = parseFinderMethod('findAllByUserIdGreaterThan');
      expect(result).toEqual({
        prefix: 'findAllBy',
        columns: [{ name: 'user_id', comparison: 'gt' }],
      });
    });
  });
});
