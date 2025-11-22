/**
 * Error codes for repository operations.
 *
 * - `INVALID_FINDER_NAME` - Malformed finder method name
 * - `ARGUMENT_COUNT_MISMATCH` - Wrong number of arguments passed to finder
 * - `METHOD_NOT_IMPLEMENTED` - Called an unknown method on repository
 * - `INVALID_ARGUMENT` - Invalid argument passed to createRepository
 */
export type RepositoryErrorCode =
  | 'INVALID_FINDER_NAME'
  | 'ARGUMENT_COUNT_MISMATCH'
  | 'METHOD_NOT_IMPLEMENTED'
  | 'INVALID_ARGUMENT';

/**
 * Custom error class for repository operations.
 *
 * Includes an error code for programmatic error handling and optional
 * context for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await repo.findByEmail();
 * } catch (error) {
 *   if (error instanceof RepositoryError) {
 *     if (error.code === 'ARGUMENT_COUNT_MISMATCH') {
 *       console.error('Wrong number of arguments:', error.context);
 *     }
 *   }
 * }
 * ```
 */
export class RepositoryError extends Error {
  /**
   * Creates a new RepositoryError.
   *
   * @param message - Human-readable error message
   * @param code - Error code for programmatic handling
   * @param context - Optional context data for debugging
   */
  constructor(
    message: string,
    public readonly code: RepositoryErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
