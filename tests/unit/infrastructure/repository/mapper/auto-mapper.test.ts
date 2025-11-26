import { describe, expect, it } from 'vitest';
import { AutoMapper } from '../../../../../src/infrastructure/repository/mapper/auto-mapper';

// Test types
interface UserRow {
  id: number;
  user_name: string;
  created_at: Date;
  kyc_status: string;
}

interface UserDTO {
  id: number;
  userName: string;
  createdAt: Date;
  kycStatus: string;
}

class UserDTOClass {
  id!: number;
  userName!: string;
  createdAt!: Date;
  kycStatus!: string;

  constructor(data: Partial<UserDTOClass>) {
    Object.assign(this, data);
  }
}

interface NestedRow {
  id: number;
  user_profile: {
    first_name: string;
    last_name: string;
  };
}

interface NestedDTO {
  id: number;
  userProfile: {
    firstName: string;
    lastName: string;
  };
}

describe('AutoMapper', () => {
  describe('toDto', () => {
    it('should convert simple row to plain object DTO', () => {
      const mapper = new AutoMapper<UserRow, UserDTO>();
      const date = new Date('2024-01-01');

      const row: UserRow = {
        id: 1,
        user_name: 'alice',
        created_at: date,
        kyc_status: 'PENDING',
      };

      const dto = mapper.toDto(row);

      expect(dto).toEqual({
        id: 1,
        userName: 'alice',
        createdAt: date,
        kycStatus: 'PENDING',
      });
    });

    it('should convert simple row to class instance DTO', () => {
      const mapper = new AutoMapper<UserRow, UserDTOClass>(UserDTOClass);
      const date = new Date('2024-01-01');

      const row: UserRow = {
        id: 1,
        user_name: 'alice',
        created_at: date,
        kyc_status: 'PENDING',
      };

      const dto = mapper.toDto(row);

      expect(dto).toBeInstanceOf(UserDTOClass);
      expect(dto.id).toBe(1);
      expect(dto.userName).toBe('alice');
      expect(dto.createdAt).toBe(date);
      expect(dto.kycStatus).toBe('PENDING');
    });

    it('should convert row with nested object', () => {
      const mapper = new AutoMapper<NestedRow, NestedDTO>();

      const row: NestedRow = {
        id: 1,
        user_profile: {
          first_name: 'Alice',
          last_name: 'Smith',
        },
      };

      const dto = mapper.toDto(row);

      expect(dto).toEqual({
        id: 1,
        userProfile: {
          firstName: 'Alice',
          lastName: 'Smith',
        },
      });
    });

    it('should preserve Date fields', () => {
      const mapper = new AutoMapper<UserRow, UserDTO>();
      const date = new Date('2024-01-01T10:00:00Z');

      const row: UserRow = {
        id: 1,
        user_name: 'alice',
        created_at: date,
        kyc_status: 'PENDING',
      };

      const dto = mapper.toDto(row);

      expect(dto.createdAt).toBe(date);
      expect(dto.createdAt instanceof Date).toBe(true);
      expect(dto.createdAt.getTime()).toBe(date.getTime());
    });

    it('should convert row with null values', () => {
      interface RowWithNulls {
        id: number;
        deleted_at: Date | null;
      }

      interface DTOWithNulls {
        id: number;
        deletedAt: Date | null;
      }

      const mapper = new AutoMapper<RowWithNulls, DTOWithNulls>();

      const row: RowWithNulls = {
        id: 1,
        deleted_at: null,
      };

      const dto = mapper.toDto(row);

      expect(dto).toEqual({
        id: 1,
        deletedAt: null,
      });
    });

    it('should convert complex snake_case keys to camelCase', () => {
      interface ComplexRow {
        user_kyc_status: string;
        api_v2_key: string;
      }

      interface ComplexDTO {
        userKycStatus: string;
        apiV2Key: string;
      }

      const mapper = new AutoMapper<ComplexRow, ComplexDTO>();

      const row: ComplexRow = {
        user_kyc_status: 'VERIFIED',
        api_v2_key: 'abc123',
      };

      const dto = mapper.toDto(row);

      expect(dto).toEqual({
        userKycStatus: 'VERIFIED',
        apiV2Key: 'abc123',
      });
    });

    it('should preserve array properties', () => {
      interface RowWithArray {
        id: number;
        tags: string[];
      }

      interface DTOWithArray {
        id: number;
        tags: string[];
      }

      const mapper = new AutoMapper<RowWithArray, DTOWithArray>();

      const row: RowWithArray = {
        id: 1,
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const dto = mapper.toDto(row);

      expect(dto.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(Array.isArray(dto.tags)).toBe(true);
    });

    it('should handle empty row', () => {
      interface EmptyRow {
        id: number;
      }

      interface EmptyDTO {
        id: number;
      }

      const mapper = new AutoMapper<EmptyRow, EmptyDTO>();

      const row: EmptyRow = { id: 1 };
      const dto = mapper.toDto(row);

      expect(dto).toEqual({ id: 1 });
    });

    it('should handle multiple underscores: user_kyc_status → userKycStatus', () => {
      interface MultiUnderscoreRow {
        user_kyc_status: string;
      }

      interface MultiUnderscoreDTO {
        userKycStatus: string;
      }

      const mapper = new AutoMapper<MultiUnderscoreRow, MultiUnderscoreDTO>();

      const row: MultiUnderscoreRow = {
        user_kyc_status: 'VERIFIED',
      };

      const dto = mapper.toDto(row);

      expect(dto.userKycStatus).toBe('VERIFIED');
    });

    it('should handle deep nesting: api_v2_key_for_oauth → apiV2KeyForOauth', () => {
      interface DeepRow {
        api_v2_key_for_oauth: string;
      }

      interface DeepDTO {
        apiV2KeyForOauth: string;
      }

      const mapper = new AutoMapper<DeepRow, DeepDTO>();

      const row: DeepRow = {
        api_v2_key_for_oauth: 'key123',
      };

      const dto = mapper.toDto(row);

      expect(dto.apiV2KeyForOauth).toBe('key123');
    });
  });

  describe('toRow', () => {
    it('should convert DTO plain object to row', () => {
      const mapper = new AutoMapper<UserRow, UserDTO>();
      const date = new Date('2024-01-01');

      const dto: UserDTO = {
        id: 1,
        userName: 'alice',
        createdAt: date,
        kycStatus: 'PENDING',
      };

      const row = mapper.toRow(dto);

      expect(row).toEqual({
        id: 1,
        user_name: 'alice',
        created_at: date,
        kyc_status: 'PENDING',
      });
    });

    it('should convert DTO class instance to row', () => {
      const mapper = new AutoMapper<UserRow, UserDTOClass>(UserDTOClass);
      const date = new Date('2024-01-01');

      const dto = new UserDTOClass({
        id: 1,
        userName: 'alice',
        createdAt: date,
        kycStatus: 'PENDING',
      });

      const row = mapper.toRow(dto);

      expect(row).toEqual({
        id: 1,
        user_name: 'alice',
        created_at: date,
        kyc_status: 'PENDING',
      });
    });

    it('should convert camelCase keys to snake_case', () => {
      const mapper = new AutoMapper<UserRow, UserDTO>();

      const dto: UserDTO = {
        id: 1,
        userName: 'alice',
        createdAt: new Date(),
        kycStatus: 'PENDING',
      };

      const row = mapper.toRow(dto);

      expect(row).toHaveProperty('user_name');
      expect(row).toHaveProperty('created_at');
      expect(row).toHaveProperty('kyc_status');
    });

    it('should preserve Date fields', () => {
      const mapper = new AutoMapper<UserRow, UserDTO>();
      const date = new Date('2024-01-01T10:00:00Z');

      const dto: UserDTO = {
        id: 1,
        userName: 'alice',
        createdAt: date,
        kycStatus: 'PENDING',
      };

      const row = mapper.toRow(dto);

      expect(row.created_at).toBe(date);
      expect(row.created_at instanceof Date).toBe(true);
    });

    it('should preserve null values', () => {
      interface DTOWithNulls {
        id: number;
        deletedAt: Date | null;
      }

      interface RowWithNulls {
        id: number;
        deleted_at: Date | null;
      }

      const mapper = new AutoMapper<RowWithNulls, DTOWithNulls>();

      const dto: DTOWithNulls = {
        id: 1,
        deletedAt: null,
      };

      const row = mapper.toRow(dto);

      expect(row.deleted_at).toBeNull();
    });

    it('should handle nested objects', () => {
      const mapper = new AutoMapper<NestedRow, NestedDTO>();

      const dto: NestedDTO = {
        id: 1,
        userProfile: {
          firstName: 'Alice',
          lastName: 'Smith',
        },
      };

      const row = mapper.toRow(dto);

      expect(row).toEqual({
        id: 1,
        user_profile: {
          first_name: 'Alice',
          last_name: 'Smith',
        },
      });
    });

    it('should handle arrays', () => {
      interface DTOWithArray {
        id: number;
        tags: string[];
      }

      interface RowWithArray {
        id: number;
        tags: string[];
      }

      const mapper = new AutoMapper<RowWithArray, DTOWithArray>();

      const dto: DTOWithArray = {
        id: 1,
        tags: ['tag1', 'tag2'],
      };

      const row = mapper.toRow(dto);

      expect(row.tags).toEqual(['tag1', 'tag2']);
    });
  });
});
