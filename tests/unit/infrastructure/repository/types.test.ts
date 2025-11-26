import type { ColumnType, Generated, Kysely } from 'kysely';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createRepository } from '../../../../src';
import type {
  ExtendableRepository,
  Repository,
  Unwrap,
  UnwrapRow,
} from '../../../../src/infrastructure/repository/types';

/**
 * Type-level tests for repository method name generation.
 * These tests verify that snake_case column names are correctly
 * converted to camelCase method names in the type system.
 */

describe('Repository Types - Snake to Camel Case Conversion', () => {
  /** Test database with complex column names */
  interface TestDatabase {
    test_table: {
      id: number;
      status: string;
      user_id: number;
      created_at: Date;
      kyc_status: string;
      api_key: string;
      user_kyc_status: string;
      api_v2_key: string;
    };
  }

  type TestRepo = Repository<TestDatabase, 'test_table'>;

  describe('SimpleFinders (findBy) - should convert snake_case to camelCase', () => {
    it('should have findById for id column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findById');
    });

    it('should have findByStatus for status column (single word)', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByStatus');
    });

    it('should have findByUserId for user_id column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByUserId');
    });

    it('should have findByCreatedAt for created_at column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByCreatedAt');
    });

    it('should have findByKycStatus for kyc_status column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByKycStatus');
    });

    it('should have findByApiKey for api_key column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByApiKey');
    });

    it('should have findByUserKycStatus for user_kyc_status column (multiple underscores)', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByUserKycStatus');
    });

    it('should have findByApiV2Key for api_v2_key column (with number)', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findByApiV2Key');
    });
  });

  describe('MultiFinders (findAllBy) - should convert snake_case to camelCase', () => {
    it('should have findAllByStatus for status column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByStatus');
    });

    it('should have findAllByUserId for user_id column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByUserId');
    });

    it('should have findAllByCreatedAt for created_at column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByCreatedAt');
    });

    it('should have findAllByKycStatus for kyc_status column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByKycStatus');
    });

    it('should have findAllByApiKey for api_key column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByApiKey');
    });

    it('should have findAllByUserKycStatus for user_kyc_status column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByUserKycStatus');
    });

    it('should have findAllByApiV2Key for api_v2_key column', () => {
      expectTypeOf<TestRepo>().toHaveProperty('findAllByApiV2Key');
    });
  });

  describe('Method signatures - should have correct parameter and return types', () => {
    it('findByKycStatus should accept string and return Promise<Row | null>', () => {
      expectTypeOf<TestRepo['findByKycStatus']>().toBeFunction();
      expectTypeOf<TestRepo['findByKycStatus']>().parameter(0).toBeString();
      expectTypeOf<TestRepo['findByKycStatus']>().returns.resolves.toEqualTypeOf<
        TestDatabase['test_table'] | null
      >();
    });

    it('findByUserId should accept number and return Promise<Row | null>', () => {
      expectTypeOf<TestRepo['findByUserId']>().toBeFunction();
      expectTypeOf<TestRepo['findByUserId']>().parameter(0).toBeNumber();
      expectTypeOf<TestRepo['findByUserId']>().returns.resolves.toEqualTypeOf<
        TestDatabase['test_table'] | null
      >();
    });

    it('findAllByKycStatus should accept string and return Promise<Row[]>', () => {
      expectTypeOf<TestRepo['findAllByKycStatus']>().toBeFunction();
      expectTypeOf<TestRepo['findAllByKycStatus']>().parameter(0).toBeString();
      expectTypeOf<TestRepo['findAllByKycStatus']>().returns.resolves.toEqualTypeOf<
        TestDatabase['test_table'][]
      >();
    });

    it('findAllByApiKey should accept string and return Promise<Row[]>', () => {
      expectTypeOf<TestRepo['findAllByApiKey']>().toBeFunction();
      expectTypeOf<TestRepo['findAllByApiKey']>().parameter(0).toBeString();
      expectTypeOf<TestRepo['findAllByApiKey']>().returns.resolves.toEqualTypeOf<
        TestDatabase['test_table'][]
      >();
    });
  });

  describe('Deep recursion - multiple underscores', () => {
    interface DeepTestDatabase {
      deep_table: {
        id: number;
        kyc_status_for_pending_transaction: string;
        api_v2_key_for_oauth_integration: string;
        user_account_settings_preferences_config: string;
      };
    }

    type DeepRepo = Repository<DeepTestDatabase, 'deep_table'>;

    it('should handle 4 underscores - kyc_status_for_pending_transaction', () => {
      expectTypeOf<DeepRepo>().toHaveProperty('findByKycStatusForPendingTransaction');
      expectTypeOf<DeepRepo>().toHaveProperty('findAllByKycStatusForPendingTransaction');
    });

    it('should handle 4 underscores with number - api_v2_key_for_oauth_integration', () => {
      expectTypeOf<DeepRepo>().toHaveProperty('findByApiV2KeyForOauthIntegration');
      expectTypeOf<DeepRepo>().toHaveProperty('findAllByApiV2KeyForOauthIntegration');
    });

    it('should handle 5 underscores - user_account_settings_preferences_config', () => {
      expectTypeOf<DeepRepo>().toHaveProperty('findByUserAccountSettingsPreferencesConfig');
      expectTypeOf<DeepRepo>().toHaveProperty('findAllByUserAccountSettingsPreferencesConfig');
    });
  });

  describe('Runtime integration - parser should handle camelCase to snake_case', () => {
    it('should be a placeholder for runtime behavior verification', () => {
      // This test ensures we think about runtime integration
      // The actual runtime tests are in create-repository.test.ts
      // These type tests verify compile-time autocomplete
      expect(true).toBe(true);
    });
  });
});

describe('Type Unwrapping - Kysely Generated and ColumnType', () => {
  describe('Unwrap<T> - Single Type Unwrapping', () => {
    it('should unwrap Generated<number> to number', () => {
      type Result = Unwrap<Generated<number>>;
      expectTypeOf<Result>().toEqualTypeOf<number>();
    });

    it('should unwrap Generated<string> to string', () => {
      type Result = Unwrap<Generated<string>>;
      expectTypeOf<Result>().toEqualTypeOf<string>();
    });

    it('should unwrap Generated<Date> to Date', () => {
      type Result = Unwrap<Generated<Date>>;
      expectTypeOf<Result>().toEqualTypeOf<Date>();
    });

    it('should unwrap ColumnType<Date, string, never> to Date', () => {
      type Result = Unwrap<ColumnType<Date, string, never>>;
      expectTypeOf<Result>().toEqualTypeOf<Date>();
    });

    it('should unwrap ColumnType<Record<string, unknown>, string, string> to Record', () => {
      type Result = Unwrap<ColumnType<Record<string, unknown>, string, string>>;
      expectTypeOf<Result>().toEqualTypeOf<Record<string, unknown>>();
    });

    it('should preserve primitive string type (no unwrapping needed)', () => {
      type Result = Unwrap<string>;
      expectTypeOf<Result>().toEqualTypeOf<string>();
    });

    it('should preserve primitive number type (no unwrapping needed)', () => {
      type Result = Unwrap<number>;
      expectTypeOf<Result>().toEqualTypeOf<number>();
    });

    it('should preserve primitive boolean type (no unwrapping needed)', () => {
      type Result = Unwrap<boolean>;
      expectTypeOf<Result>().toEqualTypeOf<boolean>();
    });

    it('should preserve Date type (no unwrapping needed)', () => {
      type Result = Unwrap<Date>;
      expectTypeOf<Result>().toEqualTypeOf<Date>();
    });

    it('should preserve nullable types: number | null', () => {
      type Result = Unwrap<number | null>;
      expectTypeOf<Result>().toEqualTypeOf<number | null>();
    });

    it('should preserve nullable types: string | null', () => {
      type Result = Unwrap<string | null>;
      expectTypeOf<Result>().toEqualTypeOf<string | null>();
    });

    it('should preserve undefined types: number | undefined', () => {
      type Result = Unwrap<number | undefined>;
      expectTypeOf<Result>().toEqualTypeOf<number | undefined>();
    });

    it('should unwrap Generated in union: Generated<number> | null', () => {
      type Result = Unwrap<Generated<number> | null>;
      // Generated<number> unwraps to number, then union with null
      expectTypeOf<Result>().toEqualTypeOf<number | null>();
    });

    it('should preserve union types: "ACTIVE" | "INACTIVE"', () => {
      type Result = Unwrap<'ACTIVE' | 'INACTIVE'>;
      expectTypeOf<Result>().toEqualTypeOf<'ACTIVE' | 'INACTIVE'>();
    });
  });

  describe('UnwrapRow<Row> - Full Row Type Unwrapping', () => {
    interface TestTableWithGenerated {
      id: Generated<number>;
      email: string;
      status: 'ACTIVE' | 'INACTIVE';
      score: number | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date> | null;
    }

    it('should unwrap all Generated fields in a table', () => {
      type Result = UnwrapRow<TestTableWithGenerated>;

      expectTypeOf<Result>().toEqualTypeOf<{
        id: number;
        email: string;
        status: 'ACTIVE' | 'INACTIVE';
        score: number | null;
        created_at: Date;
        updated_at: Date | null;
      }>();
    });

    it('should preserve primitives in unwrapped row', () => {
      type Result = UnwrapRow<TestTableWithGenerated>;

      expectTypeOf<Result['email']>().toEqualTypeOf<string>();
      expectTypeOf<Result['status']>().toEqualTypeOf<'ACTIVE' | 'INACTIVE'>();
    });

    it('should unwrap Generated<number> to number in row', () => {
      type Result = UnwrapRow<TestTableWithGenerated>;

      expectTypeOf<Result['id']>().toEqualTypeOf<number>();
    });

    it('should unwrap Generated<Date> to Date in row', () => {
      type Result = UnwrapRow<TestTableWithGenerated>;

      expectTypeOf<Result['created_at']>().toEqualTypeOf<Date>();
    });

    it('should preserve nullable fields in unwrapped row', () => {
      type Result = UnwrapRow<TestTableWithGenerated>;

      expectTypeOf<Result['score']>().toEqualTypeOf<number | null>();
      expectTypeOf<Result['updated_at']>().toEqualTypeOf<Date | null>();
    });

    it('should handle table with no Generated fields', () => {
      interface SimpleTable {
        id: number;
        name: string;
        active: boolean;
      }

      type Result = UnwrapRow<SimpleTable>;

      expectTypeOf<Result>().toEqualTypeOf<{
        id: number;
        name: string;
        active: boolean;
      }>();
    });

    it('should handle table with ColumnType fields', () => {
      interface TableWithColumnType {
        id: Generated<number>;
        metadata: ColumnType<Record<string, unknown>, string, string>;
        email: string;
      }

      type Result = UnwrapRow<TableWithColumnType>;

      expectTypeOf<Result>().toEqualTypeOf<{
        id: number;
        metadata: Record<string, unknown>;
        email: string;
      }>();
    });
  });

  describe('Repository Method Signatures with Unwrapped Types', () => {
    interface UserTableWithGenerated {
      id: Generated<number>;
      email: string;
      name: string;
      status: 'ACTIVE' | 'INACTIVE';
      score: number | null;
      created_at: Generated<Date>;
    }

    interface TestDB {
      users: UserTableWithGenerated;
    }

    type UserRepo = Repository<TestDB, 'users'>;

    it('findById should accept unwrapped primitive number (not Generated<number>)', () => {
      type FindByIdParam = Parameters<UserRepo['findById']>[0];
      expectTypeOf<FindByIdParam>().toEqualTypeOf<number>();
    });

    it('findById should return unwrapped row with primitive id', () => {
      type Result = Awaited<ReturnType<UserRepo['findById']>>;

      // Should return unwrapped row or null
      expectTypeOf<Result>().toMatchTypeOf<{
        id: number;
        email: string;
        name: string;
        status: 'ACTIVE' | 'INACTIVE';
        score: number | null;
        created_at: Date;
      } | null>();
    });

    it('findAll should return array of unwrapped rows', () => {
      type Result = Awaited<ReturnType<UserRepo['findAll']>>;

      expectTypeOf<Result>().toMatchTypeOf<
        Array<{
          id: number;
          email: string;
          created_at: Date;
        }>
      >();
    });

    it('findByEmail should accept primitive string', () => {
      type FindByEmailParam = Parameters<UserRepo['findByEmail']>[0];
      expectTypeOf<FindByEmailParam>().toEqualTypeOf<string>();
    });

    it('findByEmail should return unwrapped row | null', () => {
      type Result = Awaited<ReturnType<UserRepo['findByEmail']>>;

      expectTypeOf<Result>().toMatchTypeOf<{
        id: number;
        email: string;
        created_at: Date;
      } | null>();
    });

    it('findAllByStatus should accept primitive string', () => {
      type FindAllByStatusParam = Parameters<UserRepo['findAllByStatus']>[0];
      expectTypeOf<FindAllByStatusParam>().toEqualTypeOf<'ACTIVE' | 'INACTIVE'>();
    });

    it('findAllByStatus should return array of unwrapped rows', () => {
      type Result = Awaited<ReturnType<UserRepo['findAllByStatus']>>;

      expectTypeOf<Result>().toMatchTypeOf<
        Array<{
          id: number;
          email: string;
          status: 'ACTIVE' | 'INACTIVE';
          created_at: Date;
        }>
      >();
    });

    it('update should accept primitive number for id parameter', () => {
      type UpdateIdParam = Parameters<UserRepo['update']>[0];
      expectTypeOf<UpdateIdParam>().toEqualTypeOf<number>();
    });

    it('update should return unwrapped row | null', () => {
      type Result = Awaited<ReturnType<UserRepo['update']>>;

      expectTypeOf<Result>().toMatchTypeOf<{
        id: number;
        email: string;
        created_at: Date;
      } | null>();
    });

    it('delete should accept primitive number for id parameter', () => {
      type DeleteIdParam = Parameters<UserRepo['delete']>[0];
      expectTypeOf<DeleteIdParam>().toEqualTypeOf<number>();
    });

    it('count should accept partial unwrapped row', () => {
      type CountParam = Parameters<UserRepo['count']>[0];

      expectTypeOf<CountParam>().toMatchTypeOf<
        | {
            id?: number;
            email?: string;
            status?: 'ACTIVE' | 'INACTIVE';
            created_at?: Date;
          }
        | undefined
      >();
    });

    it('exists should accept partial unwrapped row', () => {
      type ExistsParam = Parameters<UserRepo['exists']>[0];

      expectTypeOf<ExistsParam>().toMatchTypeOf<
        | {
            id?: number;
            email?: string;
            created_at?: Date;
          }
        | undefined
      >();
    });
  });
});

/**
 * Type-level tests for ExtendableRepository and .extend<T>() method.
 * These tests verify that complex query methods can be typed explicitly.
 */
describe('ExtendableRepository and .extend<T>() Types', () => {
  interface UserTable {
    id: Generated<number>;
    email: string;
    status: 'ACTIVE' | 'INACTIVE';
    age: number;
    created_at: Generated<Date>;
  }

  interface TestDB {
    users: UserTable;
  }

  // For test purposes, define what the unwrapped user looks like
  interface UnwrappedUser {
    id: number;
    email: string;
    status: 'ACTIVE' | 'INACTIVE';
    age: number;
    created_at: Date;
  }

  interface UserComplexQueries {
    findByEmailAndStatus(
      email: string,
      status: 'ACTIVE' | 'INACTIVE'
    ): Promise<UnwrappedUser | null>;
    findAllByStatusOrderByAgeDesc(status: 'ACTIVE' | 'INACTIVE'): Promise<UnwrappedUser[]>;
    findByAgeGreaterThan(age: number): Promise<UnwrappedUser[]>;
  }

  // Mock db for type tests
  const mockDb = {} as Kysely<TestDB>;

  describe('ExtendableRepository type', () => {
    it('should include extend method in type definition', () => {
      type TestExtendable = ExtendableRepository<TestDB, 'users', UserTable, 'id'>;
      expectTypeOf<TestExtendable>().toHaveProperty('extend');
    });

    it('should include all base repository methods', () => {
      type TestExtendable = ExtendableRepository<TestDB, 'users', UserTable, 'id'>;
      expectTypeOf<TestExtendable>().toHaveProperty('findById');
      expectTypeOf<TestExtendable>().toHaveProperty('findAll');
      expectTypeOf<TestExtendable>().toHaveProperty('create');
      expectTypeOf<TestExtendable>().toHaveProperty('update');
      expectTypeOf<TestExtendable>().toHaveProperty('delete');
    });

    it('should include simple finder methods', () => {
      type TestExtendable = ExtendableRepository<TestDB, 'users', UserTable, 'id'>;
      expectTypeOf<TestExtendable>().toHaveProperty('findByEmail');
      expectTypeOf<TestExtendable>().toHaveProperty('findByStatus');
      expectTypeOf<TestExtendable>().toHaveProperty('findAllByEmail');
      expectTypeOf<TestExtendable>().toHaveProperty('findAllByStatus');
    });
  });

  describe('createRepository().extend<T>() type inference', () => {
    it('should return ExtendableRepository with extend method', () => {
      const repo = createRepository(mockDb, 'users');
      expectTypeOf(repo).toHaveProperty('extend');
      expectTypeOf(repo.extend).toBeFunction();
    });

    it('should type complex query parameters correctly after extend', () => {
      const repo = createRepository(mockDb, 'users').extend<UserComplexQueries>();

      // First parameter should be string (email)
      expectTypeOf(repo.findByEmailAndStatus).parameter(0).toBeString();
      // Second parameter should be 'ACTIVE' | 'INACTIVE'
      expectTypeOf(repo.findByEmailAndStatus).parameter(1).toEqualTypeOf<'ACTIVE' | 'INACTIVE'>();
    });

    it('should type complex query return types correctly after extend', () => {
      const repo = createRepository(mockDb, 'users').extend<UserComplexQueries>();

      // Return type for single finder (check function return type without executing)
      expectTypeOf(
        repo.findByEmailAndStatus
      ).returns.resolves.toEqualTypeOf<UnwrappedUser | null>();

      // Return type for multi finder
      expectTypeOf(repo.findAllByStatusOrderByAgeDesc).returns.resolves.toEqualTypeOf<
        UnwrappedUser[]
      >();
    });

    it('should preserve base repository methods after extend', () => {
      const repo = createRepository(mockDb, 'users').extend<UserComplexQueries>();

      expectTypeOf(repo.findById).toBeFunction();
      expectTypeOf(repo.findAll).toBeFunction();
      expectTypeOf(repo.create).toBeFunction();
      expectTypeOf(repo.update).toBeFunction();
      expectTypeOf(repo.delete).toBeFunction();
    });

    it('should preserve simple finder methods after extend', () => {
      const repo = createRepository(mockDb, 'users').extend<UserComplexQueries>();

      expectTypeOf(repo.findByEmail).toBeFunction();
      expectTypeOf(repo.findAllByStatus).toBeFunction();
    });

    it('should work without calling extend (backward compatible)', () => {
      const repo = createRepository(mockDb, 'users');

      // All base methods should work
      expectTypeOf(repo.findById).toBeFunction();
      expectTypeOf(repo.findByEmail).toBeFunction();
      expectTypeOf(repo.findAll).toBeFunction();
    });

    it('should allow empty Queries type in extend', () => {
      // biome-ignore lint/complexity/noBannedTypes: testing empty type
      const repo = createRepository(mockDb, 'users').extend<{}>();

      // Base methods should still work
      expectTypeOf(repo.findById).toBeFunction();
      expectTypeOf(repo.findAll).toBeFunction();
    });

    it('should work with custom id column', () => {
      interface ProductTable {
        sku: string;
        name: string;
        price: number;
      }

      interface ProductDB {
        products: ProductTable;
      }

      interface ProductQueries {
        findByNameAndSku(name: string, sku: string): Promise<ProductTable | null>;
      }

      const productDb = {} as Kysely<ProductDB>;
      const repo = createRepository(productDb, 'products', {
        idColumn: 'sku',
      }).extend<ProductQueries>();

      // findById should accept string (sku type)
      expectTypeOf(repo.findById).parameter(0).toBeString();
      // Custom query should be typed
      expectTypeOf(repo.findByNameAndSku).toBeFunction();
    });

    it('should not lose extend method type after calling extend', () => {
      // After extend, the result should still have proper typing
      const repo = createRepository(mockDb, 'users').extend<UserComplexQueries>();

      // Custom queries should be available
      expectTypeOf(repo.findByEmailAndStatus).toBeFunction();
      expectTypeOf(repo.findAllByStatusOrderByAgeDesc).toBeFunction();
      expectTypeOf(repo.findByAgeGreaterThan).toBeFunction();
    });
  });
});
