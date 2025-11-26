import { describe, expect, it } from 'vitest';
import {
  convertObjectKeys,
  toCamelCase,
  toSnakeCase,
} from '../../../../../src/infrastructure/repository/mapper/utils';

describe('Mapper Utils', () => {
  describe('toCamelCase', () => {
    it('should convert user_id to userId', () => {
      expect(toCamelCase('user_id')).toBe('userId');
    });

    it('should convert created_at to createdAt', () => {
      expect(toCamelCase('created_at')).toBe('createdAt');
    });

    it('should convert kyc_status to kycStatus', () => {
      expect(toCamelCase('kyc_status')).toBe('kycStatus');
    });

    it('should convert api_v2_key to apiV2Key', () => {
      expect(toCamelCase('api_v2_key')).toBe('apiV2Key');
    });

    it('should convert kyc_status_for_pending_transaction to kycStatusForPendingTransaction', () => {
      expect(toCamelCase('kyc_status_for_pending_transaction')).toBe(
        'kycStatusForPendingTransaction'
      );
    });

    it('should keep single word status unchanged', () => {
      expect(toCamelCase('status')).toBe('status');
    });

    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle leading uppercase sequences like XMLHttpRequest', () => {
      expect(toCamelCase('xml_http_request')).toBe('xmlHttpRequest');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert userId to user_id', () => {
      expect(toSnakeCase('userId')).toBe('user_id');
    });

    it('should convert createdAt to created_at', () => {
      expect(toSnakeCase('createdAt')).toBe('created_at');
    });

    it('should convert kycStatus to kyc_status', () => {
      expect(toSnakeCase('kycStatus')).toBe('kyc_status');
    });

    it('should convert apiV2Key to api_v2_key', () => {
      expect(toSnakeCase('apiV2Key')).toBe('api_v2_key');
    });

    it('should keep single word status unchanged', () => {
      expect(toSnakeCase('status')).toBe('status');
    });

    it('should handle XMLHttpRequest to xml_http_request', () => {
      expect(toSnakeCase('XMLHttpRequest')).toBe('xml_http_request');
    });

    it('should handle empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });
  });

  describe('convertObjectKeys', () => {
    const snakeToCamel = toCamelCase;
    const camelToSnake = toSnakeCase;

    it('should convert simple object from snake_case to camelCase', () => {
      const input = { user_id: 1, created_at: new Date('2024-01-01') };
      const result = convertObjectKeys(input, snakeToCamel);

      expect(result).toEqual({
        userId: 1,
        createdAt: input.created_at,
      });
    });

    it('should convert simple object from camelCase to snake_case', () => {
      const input = { userId: 1, createdAt: new Date('2024-01-01') };
      const result = convertObjectKeys(input, camelToSnake);

      expect(result).toEqual({
        user_id: 1,
        created_at: input.createdAt,
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user_id: 1,
        user_profile: {
          first_name: 'Alice',
          last_name: 'Smith',
        },
      };
      const result = convertObjectKeys(input, snakeToCamel);

      expect(result).toEqual({
        userId: 1,
        userProfile: {
          firstName: 'Alice',
          lastName: 'Smith',
        },
      });
    });

    it('should preserve arrays', () => {
      const input = {
        user_id: 1,
        tags: ['tag1', 'tag2', 'tag3'],
      };
      const result = convertObjectKeys(input, snakeToCamel);

      expect(result).toEqual({
        userId: 1,
        tags: ['tag1', 'tag2', 'tag3'],
      });
    });

    it('should preserve Date objects', () => {
      const date = new Date('2024-01-01');
      const input = { created_at: date };
      const result = convertObjectKeys(input, snakeToCamel) as unknown as { createdAt: Date };

      expect(result.createdAt).toBe(date);
      expect(result.createdAt instanceof Date).toBe(true);
    });

    it('should preserve null and undefined values', () => {
      const input = {
        user_id: 1,
        deleted_at: null,
        optional_field: undefined,
      };
      const result = convertObjectKeys(input, snakeToCamel);

      expect(result).toEqual({
        userId: 1,
        deletedAt: null,
        optionalField: undefined,
      });
    });

    it('should handle empty objects', () => {
      const input = {};
      const result = convertObjectKeys(input, snakeToCamel);

      expect(result).toEqual({});
    });

    it('should handle mixed depth nested objects', () => {
      const input = {
        user_id: 1,
        user_settings: {
          notification_preferences: {
            email_enabled: true,
            sms_enabled: false,
          },
        },
      };
      const result = convertObjectKeys(input, snakeToCamel);

      expect(result).toEqual({
        userId: 1,
        userSettings: {
          notificationPreferences: {
            emailEnabled: true,
            smsEnabled: false,
          },
        },
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        user_id: 1,
        user_tags: [
          { tag_name: 'admin', created_at: new Date('2024-01-01') },
          { tag_name: 'moderator', created_at: new Date('2024-01-02') },
        ],
      };
      const result = convertObjectKeys(input, snakeToCamel) as unknown as {
        userId: number;
        userTags: Array<{ tagName: string; createdAt: Date }>;
      };

      expect(result).toEqual({
        userId: 1,
        userTags: [
          { tagName: 'admin', createdAt: input.user_tags[0]?.created_at },
          { tagName: 'moderator', createdAt: input.user_tags[1]?.created_at },
        ],
      });
    });

    it('should handle null input', () => {
      const result = convertObjectKeys(null, snakeToCamel);
      expect(result).toBeNull();
    });

    it('should handle primitive values', () => {
      expect(convertObjectKeys('string', snakeToCamel)).toBe('string');
      expect(convertObjectKeys(123, snakeToCamel)).toBe(123);
      expect(convertObjectKeys(true, snakeToCamel)).toBe(true);
    });
  });
});
