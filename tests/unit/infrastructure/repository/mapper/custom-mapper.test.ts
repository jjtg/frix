import { describe, expect, it } from 'vitest';
import { CustomMapper } from '../../../../../src/infrastructure/repository/mapper/custom-mapper';

describe('CustomMapper', () => {
  it('should use custom toDto transformation', () => {
    interface UserRow {
      id: number;
      first_name: string;
      last_name: string;
      status: 'ACTIVE' | 'INACTIVE';
    }

    interface UserDTO {
      id: number;
      fullName: string;
      isActive: boolean;
    }

    const mapper = new CustomMapper<UserRow, UserDTO>({
      toDto: (row) => ({
        id: row.id,
        fullName: `${row.first_name} ${row.last_name}`,
        isActive: row.status === 'ACTIVE',
      }),
      toRow: (dto) => ({
        id: dto.id,
        first_name: dto.fullName.split(' ')[0] || '',
        last_name: dto.fullName.split(' ')[1] || '',
        status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
      }),
    });

    const row: UserRow = {
      id: 1,
      first_name: 'Alice',
      last_name: 'Smith',
      status: 'ACTIVE',
    };

    const dto = mapper.toDto(row);

    expect(dto).toEqual({
      id: 1,
      fullName: 'Alice Smith',
      isActive: true,
    });
  });

  it('should use custom toRow transformation', () => {
    interface UserRow {
      id: number;
      first_name: string;
      last_name: string;
      status: 'ACTIVE' | 'INACTIVE';
    }

    interface UserDTO {
      id: number;
      fullName: string;
      isActive: boolean;
    }

    const mapper = new CustomMapper<UserRow, UserDTO>({
      toDto: (row) => ({
        id: row.id,
        fullName: `${row.first_name} ${row.last_name}`,
        isActive: row.status === 'ACTIVE',
      }),
      toRow: (dto) => ({
        id: dto.id,
        first_name: dto.fullName.split(' ')[0] || '',
        last_name: dto.fullName.split(' ')[1] || '',
        status: dto.isActive ? 'ACTIVE' : 'INACTIVE',
      }),
    });

    const dto: UserDTO = {
      id: 1,
      fullName: 'Bob Jones',
      isActive: false,
    };

    const row = mapper.toRow(dto);

    expect(row).toEqual({
      id: 1,
      first_name: 'Bob',
      last_name: 'Jones',
      status: 'INACTIVE',
    });
  });

  it('should combine multiple row fields into one DTO field', () => {
    interface AddressRow {
      id: number;
      street: string;
      city: string;
      state: string;
      zip: string;
    }

    interface AddressDTO {
      id: number;
      fullAddress: string;
    }

    const mapper = new CustomMapper<AddressRow, AddressDTO>({
      toDto: (row) => ({
        id: row.id,
        fullAddress: `${row.street}, ${row.city}, ${row.state} ${row.zip}`,
      }),
      toRow: (dto) => {
        const parts = dto.fullAddress.split(', ');
        const [street, city, stateZip] = parts;
        const [state, zip] = (stateZip || '').split(' ');
        return {
          id: dto.id,
          street: street || '',
          city: city || '',
          state: state || '',
          zip: zip || '',
        };
      },
    });

    const row: AddressRow = {
      id: 1,
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    };

    const dto = mapper.toDto(row);

    expect(dto.fullAddress).toBe('123 Main St, Springfield, IL 62701');
  });

  it('should split one DTO field into multiple row fields', () => {
    interface AddressRow {
      id: number;
      street: string;
      city: string;
      state: string;
      zip: string;
    }

    interface AddressDTO {
      id: number;
      fullAddress: string;
    }

    const mapper = new CustomMapper<AddressRow, AddressDTO>({
      toDto: (row) => ({
        id: row.id,
        fullAddress: `${row.street}, ${row.city}, ${row.state} ${row.zip}`,
      }),
      toRow: (dto) => {
        const parts = dto.fullAddress.split(', ');
        const [street, city, stateZip] = parts;
        const [state, zip] = (stateZip || '').split(' ');
        return {
          id: dto.id,
          street: street || '',
          city: city || '',
          state: state || '',
          zip: zip || '',
        };
      },
    });

    const dto: AddressDTO = {
      id: 1,
      fullAddress: '456 Oak Ave, Chicago, IL 60601',
    };

    const row = mapper.toRow(dto);

    expect(row).toEqual({
      id: 1,
      street: '456 Oak Ave',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
    });
  });

  it('should perform custom type conversions (string to boolean)', () => {
    interface ConfigRow {
      id: number;
      feature_enabled: 'true' | 'false';
      max_retries: string; // Stored as string in DB
    }

    interface ConfigDTO {
      id: number;
      featureEnabled: boolean;
      maxRetries: number;
    }

    const mapper = new CustomMapper<ConfigRow, ConfigDTO>({
      toDto: (row) => ({
        id: row.id,
        featureEnabled: row.feature_enabled === 'true',
        maxRetries: Number.parseInt(row.max_retries, 10),
      }),
      toRow: (dto) => ({
        id: dto.id,
        feature_enabled: dto.featureEnabled ? 'true' : 'false',
        max_retries: dto.maxRetries.toString(),
      }),
    });

    const row: ConfigRow = {
      id: 1,
      feature_enabled: 'true',
      max_retries: '5',
    };

    const dto = mapper.toDto(row);

    expect(dto.featureEnabled).toBe(true);
    expect(typeof dto.featureEnabled).toBe('boolean');
    expect(dto.maxRetries).toBe(5);
    expect(typeof dto.maxRetries).toBe('number');

    const backToRow = mapper.toRow(dto);

    expect(backToRow.feature_enabled).toBe('true');
    expect(backToRow.max_retries).toBe('5');
  });
});
