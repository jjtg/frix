import { describe, expect, it } from 'vitest';
import { RepositoryError } from '../../../../src/shared/errors/repository-error';

describe('RepositoryError', () => {
  describe('constructor', () => {
    it('should create error with correct name, message, and code', () => {
      const error = new RepositoryError('Test error message', 'INVALID_FINDER_NAME');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RepositoryError);
      expect(error.name).toBe('RepositoryError');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('INVALID_FINDER_NAME');
    });

    it('should preserve context when provided', () => {
      const context = { methodName: 'findBy', tableName: 'user' };
      const error = new RepositoryError('Invalid method', 'INVALID_FINDER_NAME', context);

      expect(error.context).toEqual(context);
      expect(error.context?.methodName).toBe('findBy');
      expect(error.context?.tableName).toBe('user');
    });

    it('should have undefined context when not provided', () => {
      const error = new RepositoryError('Test error', 'METHOD_NOT_IMPLEMENTED');

      expect(error.context).toBeUndefined();
    });

    it('should support all error codes', () => {
      const codes = [
        'INVALID_FINDER_NAME',
        'ARGUMENT_COUNT_MISMATCH',
        'METHOD_NOT_IMPLEMENTED',
        'INVALID_ARGUMENT',
      ] as const;

      for (const code of codes) {
        const error = new RepositoryError('Test', code);
        expect(error.code).toBe(code);
      }
    });

    it('should create error with INVALID_ARGUMENT code', () => {
      const error = new RepositoryError(
        'Invalid argument: tableName cannot be empty',
        'INVALID_ARGUMENT'
      );

      expect(error.code).toBe('INVALID_ARGUMENT');
      expect(error.message).toContain('tableName');
    });
  });
});
