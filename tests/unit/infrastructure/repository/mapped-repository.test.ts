import type { Generated, Kysely } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoMapper, CustomMapper, createRepository } from '../../../../src';
import type { UnwrapRow } from '../../../../src/infrastructure/repository/types';

// Test table type with snake_case columns (database format)
interface UserTable {
  id: Generated<number>;
  email: string;
  user_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Generated<Date>;
}

// DTO type with camelCase properties (API format)
interface UserDTO {
  id: number;
  email: string;
  userName: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
}

// Summary DTO for custom mapper tests
interface UserSummaryDTO {
  id: number;
  displayName: string;
  isActive: boolean;
}

interface TestDB {
  users: UserTable;
}

// Mock data (represents what comes back from database - snake_case)
const mockDate = new Date('2024-01-01');
const mockUsers: UnwrapRow<UserTable>[] = [
  {
    id: 1,
    email: 'test@example.com',
    user_name: 'Test User',
    status: 'ACTIVE',
    created_at: mockDate,
  },
  {
    id: 2,
    email: 'other@example.com',
    user_name: 'Other User',
    status: 'INACTIVE',
    created_at: mockDate,
  },
];

// Expected DTO format (camelCase)
const expectedDtos: UserDTO[] = [
  {
    id: 1,
    email: 'test@example.com',
    userName: 'Test User',
    status: 'ACTIVE',
    createdAt: mockDate,
  },
  {
    id: 2,
    email: 'other@example.com',
    userName: 'Other User',
    status: 'INACTIVE',
    createdAt: mockDate,
  },
];

// Helper to create mock Kysely instance
function createMockDb(): Kysely<TestDB> {
  const mockExecute = vi.fn();
  const mockExecuteTakeFirst = vi.fn();
  const mockExecuteTakeFirstOrThrow = vi.fn();
  const mockDeleteExecuteTakeFirst = vi.fn();

  const mockQueryBuilder = {
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
  };

  const mockUpdateBuilder = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirst: mockExecuteTakeFirst,
  };

  const mockDeleteBuilder = {
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: mockDeleteExecuteTakeFirst,
  };

  const mockOnConflictBuilder = {
    doUpdateSet: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  const mockInsertBuilder = {
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
    onConflict: vi.fn().mockImplementation((cb: (oc: unknown) => unknown) => {
      const oc = {
        column: vi.fn().mockReturnValue(mockOnConflictBuilder),
      };
      cb(oc);
      return mockOnConflictBuilder;
    }),
  };

  const mockCountBuilder = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ count: 5 }),
  };

  const mockExistsBuilder = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ exists: 1 }),
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    insertInto: vi.fn().mockReturnValue(mockInsertBuilder),
    updateTable: vi.fn().mockReturnValue(mockUpdateBuilder),
    deleteFrom: vi.fn().mockReturnValue(mockDeleteBuilder),
    fn: {
      count: vi.fn().mockReturnValue({
        as: vi.fn().mockReturnValue('count(id) as count'),
      }),
    },
    _mockExecute: mockExecute,
    _mockExecuteTakeFirst: mockExecuteTakeFirst,
    _mockExecuteTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
    _mockDeleteExecuteTakeFirst: mockDeleteExecuteTakeFirst,
    _mockWhere: mockQueryBuilder.where,
    _mockValues: mockInsertBuilder.values,
    _mockSet: mockUpdateBuilder.set,
    _mockUpdateWhere: mockUpdateBuilder.where,
    _mockDeleteWhere: mockDeleteBuilder.where,
    _mockOnConflict: mockInsertBuilder.onConflict,
    _mockOrderBy: mockQueryBuilder.orderBy,
    _mockLimit: mockQueryBuilder.limit,
    _mockOffset: mockQueryBuilder.offset,
    _mockCountBuilder: mockCountBuilder,
    _mockExistsBuilder: mockExistsBuilder,
  };

  return mockDb as unknown as Kysely<TestDB>;
}

describe('MappedRepository', () => {
  let mockDb: Kysely<TestDB> & {
    _mockExecute: ReturnType<typeof vi.fn>;
    _mockExecuteTakeFirst: ReturnType<typeof vi.fn>;
    _mockExecuteTakeFirstOrThrow: ReturnType<typeof vi.fn>;
    _mockDeleteExecuteTakeFirst: ReturnType<typeof vi.fn>;
    _mockWhere: ReturnType<typeof vi.fn>;
    _mockValues: ReturnType<typeof vi.fn>;
    _mockSet: ReturnType<typeof vi.fn>;
    _mockUpdateWhere: ReturnType<typeof vi.fn>;
    _mockDeleteWhere: ReturnType<typeof vi.fn>;
    _mockOnConflict: ReturnType<typeof vi.fn>;
    _mockOrderBy: ReturnType<typeof vi.fn>;
    _mockLimit: ReturnType<typeof vi.fn>;
    _mockOffset: ReturnType<typeof vi.fn>;
    _mockCountBuilder: {
      select: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      executeTakeFirstOrThrow: ReturnType<typeof vi.fn>;
    };
    _mockExistsBuilder: {
      select: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      executeTakeFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockDb = createMockDb() as typeof mockDb;
  });

  describe('withMapper()', () => {
    it('should return MappedRepository when called with AutoMapper', () => {
      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      expect(mapped).toBeDefined();
      expect(mapped.findAll).toBeDefined();
      expect(mapped.findById).toBeDefined();
      expect(mapped.create).toBeDefined();
      expect(mapped.raw).toBeDefined();
    });

    it('should return MappedRepository when called with CustomMapper', () => {
      const mapper = new CustomMapper<UnwrapRow<UserTable>, UserSummaryDTO>({
        toDto: (row) => ({
          id: row.id,
          displayName: row.user_name,
          isActive: row.status === 'ACTIVE',
        }),
        toRow: (dto) => ({
          id: dto.id,
          email: '',
          user_name: dto.displayName,
          status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
          created_at: new Date(),
        }),
      });

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(mapper);

      expect(mapped).toBeDefined();
    });

    it('should return MappedRepository when called with inline transformer', () => {
      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper({
        toDto: (row: UnwrapRow<UserTable>) => ({
          id: row.id,
          displayName: row.user_name,
          isActive: row.status === 'ACTIVE',
        }),
        toRow: (dto: UserSummaryDTO) => ({
          id: dto.id,
          email: '',
          user_name: dto.displayName,
          status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
          created_at: new Date(),
        }),
      });

      expect(mapped).toBeDefined();
    });

    it('should provide raw property for unmapped repository access', () => {
      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      // raw should be the underlying repository
      expect(mapped.raw).toBeDefined();
      expect(mapped.raw.findAll).toBeDefined();
      expect(mapped.raw.findById).toBeDefined();
    });
  });

  describe('read operations', () => {
    it('findAll() should return array of DTOs with camelCase keys', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());
      const dtos = await mapped.findAll();

      expect(dtos).toHaveLength(2);
      expect(dtos[0]).toHaveProperty('userName');
      expect(dtos[0]).toHaveProperty('createdAt');
      expect(dtos[0]).not.toHaveProperty('user_name');
      expect(dtos[0]).not.toHaveProperty('created_at');
      expect(dtos).toEqual(expectedDtos);
    });

    it('findById() should return DTO with camelCase keys', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());
      const dto = await mapped.findById(1);

      expect(dto).not.toBeNull();
      expect(dto).toHaveProperty('userName', 'Test User');
      expect(dto).toHaveProperty('createdAt');
      expect(dto).not.toHaveProperty('user_name');
    });

    it('findById() should return null for non-existent row (not mapped null)', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(undefined);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());
      const dto = await mapped.findById(99999);

      expect(dto).toBeNull();
    });

    it('dynamic finders (findByX) should return DTO', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());
      const dto = await mapped.findByEmail('test@example.com');

      expect(dto).toHaveProperty('userName');
      expect(dto).toHaveProperty('createdAt');
    });

    it('dynamic finders (findAllByX) should return array of DTOs', async () => {
      mockDb._mockExecute.mockResolvedValue([mockUsers[0]]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());
      const dtos = await mapped.findAllByStatus('ACTIVE');

      expect(Array.isArray(dtos)).toBe(true);
      expect(dtos[0]).toHaveProperty('userName');
      expect(dtos[0]).toHaveProperty('createdAt');
    });
  });

  describe('write operations', () => {
    it('create() should accept DTO (camelCase) and return DTO', async () => {
      const insertedRow = { ...mockUsers[0], id: 3 };
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(insertedRow);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const dto = await mapped.create({
        email: 'new@example.com',
        userName: 'New User',
        status: 'ACTIVE',
        createdAt: mockDate,
      });

      // Should call DB with snake_case
      expect(mockDb._mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          user_name: 'New User',
          email: 'new@example.com',
        })
      );

      // Should return DTO with camelCase
      expect(dto).toHaveProperty('userName');
      expect(dto).toHaveProperty('createdAt');
    });

    it('update() should accept partial DTO (camelCase) and return DTO', async () => {
      const updatedRow = { ...mockUsers[0], user_name: 'Updated Name' };
      mockDb._mockExecuteTakeFirst.mockResolvedValue(updatedRow);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const dto = await mapped.update(1, { userName: 'Updated Name' });

      // Should call DB with snake_case
      expect(mockDb._mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          user_name: 'Updated Name',
        })
      );

      // Should return DTO
      expect(dto).not.toBeNull();
      expect(dto).toHaveProperty('userName');
    });

    it('update() should return null for non-existent row', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(undefined);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const dto = await mapped.update(99999, { userName: 'Updated' });

      expect(dto).toBeNull();
    });

    it('save() should accept full DTO and return DTO', async () => {
      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const dto = await mapped.save({
        id: 1,
        email: 'test@example.com',
        userName: 'Test User',
        status: 'ACTIVE',
        createdAt: mockDate,
      });

      expect(dto).toHaveProperty('userName');
      expect(dto).toHaveProperty('createdAt');
    });

    it('delete() should pass through and return boolean', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 1n });

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const result = await mapped.delete(1);

      expect(result).toBe(true);
    });
  });

  describe('batch operations', () => {
    it('createMany() should accept DTOs and return DTOs', async () => {
      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const dtos = await mapped.createMany([
        { email: 'a@test.com', userName: 'User A', status: 'ACTIVE', createdAt: mockDate },
        { email: 'b@test.com', userName: 'User B', status: 'ACTIVE', createdAt: mockDate },
      ]);

      // Check that DTOs are returned
      expect(Array.isArray(dtos)).toBe(true);
      expect(dtos).toHaveLength(2);
      expect(dtos[0]).toHaveProperty('userName');
      expect(dtos[0]).toHaveProperty('createdAt');
    });

    it('createMany() with skipReturn should return count (not mapped)', async () => {
      mockDb._mockExecute.mockResolvedValue([{ numInsertedOrUpdatedRows: 2n }]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const result = await mapped.createMany(
        [
          { email: 'a@test.com', userName: 'User A', status: 'ACTIVE', createdAt: mockDate },
          { email: 'b@test.com', userName: 'User B', status: 'ACTIVE', createdAt: mockDate },
        ],
        { skipReturn: true }
      );

      expect(result).toEqual({ count: 2 });
    });

    it('updateMany() should accept DTO-style criteria and data', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue({ numUpdatedRows: 3n });

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      // Use camelCase criteria
      const count = await mapped.updateMany({ status: 'INACTIVE' }, { status: 'ACTIVE' });

      expect(count).toBe(3);
    });

    it('deleteMany() should accept DTO-style criteria', async () => {
      mockDb._mockDeleteExecuteTakeFirst.mockResolvedValue({ numDeletedRows: 2n });

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const count = await mapped.deleteMany({ status: 'INACTIVE' });

      expect(count).toBe(2);
    });
  });

  describe('criteria operations', () => {
    it('count() should accept DTO-style criteria (camelCase keys)', async () => {
      const mockCountBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ count: 5 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockCountBuilder);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      // Pass camelCase criteria - should be converted to snake_case internally
      const count = await mapped.count({ userName: 'Test User' });

      expect(typeof count).toBe('number');
      expect(count).toBe(5);
      // Criteria should be converted to snake_case for DB query
      expect(mockCountBuilder.where).toHaveBeenCalledWith('user_name', '=', 'Test User');
    });

    it('exists() should accept DTO-style criteria (camelCase keys)', async () => {
      const mockExistsBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ exists: 1 }),
      };
      (mockDb.selectFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockExistsBuilder);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const exists = await mapped.exists({ userName: 'Test User' });

      expect(typeof exists).toBe('boolean');
      expect(exists).toBe(true);
      // Criteria should be converted to snake_case for DB query
      expect(mockExistsBuilder.where).toHaveBeenCalledWith('user_name', '=', 'Test User');
    });
  });

  describe('raw access', () => {
    it('raw property should return unmapped repository', async () => {
      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const row = await mapped.raw.findById(1);

      // Should return raw snake_case format
      expect(row).toHaveProperty('user_name');
      expect(row).toHaveProperty('created_at');
      expect(row).not.toHaveProperty('userName');
      expect(row).not.toHaveProperty('createdAt');
    });

    it('raw repository should have all base methods', () => {
      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      expect(mapped.raw.findAll).toBeDefined();
      expect(mapped.raw.findById).toBeDefined();
      expect(mapped.raw.create).toBeDefined();
      expect(mapped.raw.update).toBeDefined();
      expect(mapped.raw.delete).toBeDefined();
      expect(mapped.raw.save).toBeDefined();
      expect(mapped.raw.createMany).toBeDefined();
      expect(mapped.raw.count).toBeDefined();
      expect(mapped.raw.exists).toBeDefined();
    });

    it('query() should return raw query builder', () => {
      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const builder = mapped.query();

      expect(builder).toHaveProperty('where');
      expect(builder).toHaveProperty('execute');
    });
  });

  describe('chaining', () => {
    it('should work with extend() before withMapper()', async () => {
      interface UserQueries {
        findByEmailAndStatus(email: string, status: string): Promise<UserDTO | null>;
        findAllByStatusOrderByUserNameAsc(status: string): Promise<UserDTO[]>;
      }

      mockDb._mockExecuteTakeFirst.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'users')
        .extend<UserQueries>()
        .withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      // Dynamic finder should work and return DTO
      const dto = await repo.findByEmailAndStatus('test@example.com', 'ACTIVE');

      expect(dto).toHaveProperty('userName');
      expect(dto).toHaveProperty('createdAt');
    });

    it('should preserve type-safe complex query methods', async () => {
      interface UserQueries {
        findAllByStatusOrderByUserNameDesc(status: string): Promise<UserDTO[]>;
      }

      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'users')
        .extend<UserQueries>()
        .withMapper(new AutoMapper<UnwrapRow<UserTable>, UserDTO>());

      const dtos = await repo.findAllByStatusOrderByUserNameDesc('ACTIVE');

      expect(Array.isArray(dtos)).toBe(true);
      expect(dtos[0]).toHaveProperty('userName');
    });
  });

  describe('CustomMapper integration', () => {
    it('should transform using custom mapping logic', async () => {
      const mapper = new CustomMapper<UnwrapRow<UserTable>, UserSummaryDTO>({
        toDto: (row) => ({
          id: row.id,
          displayName: row.user_name,
          isActive: row.status === 'ACTIVE',
        }),
        toRow: (dto) => ({
          id: dto.id,
          email: '',
          user_name: dto.displayName,
          status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
          created_at: new Date(),
        }),
      });

      mockDb._mockExecute.mockResolvedValue(mockUsers);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(mapper);
      const dtos = await mapped.findAll();

      expect(dtos[0]).toHaveProperty('displayName', 'Test User');
      expect(dtos[0]).toHaveProperty('isActive', true);
      expect(dtos[0]).not.toHaveProperty('userName');
      expect(dtos[0]).not.toHaveProperty('email');
    });

    it('should apply custom toRow transformation on create', async () => {
      const mapper = new CustomMapper<UnwrapRow<UserTable>, UserSummaryDTO>({
        toDto: (row) => ({
          id: row.id,
          displayName: row.user_name,
          isActive: row.status === 'ACTIVE',
        }),
        toRow: (dto) => ({
          id: dto.id,
          email: 'generated@example.com',
          user_name: dto.displayName,
          status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
          created_at: new Date(),
        }),
      });

      mockDb._mockExecuteTakeFirstOrThrow.mockResolvedValue(mockUsers[0]);

      const repo = createRepository(mockDb, 'users');
      const mapped = repo.withMapper(mapper);

      await mapped.create({
        displayName: 'New User',
        isActive: true,
      });

      expect(mockDb._mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          user_name: 'New User',
          email: 'generated@example.com',
          status: 'ACTIVE',
        })
      );
    });
  });
});
