# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.6] - 2025-11-26

### Added

- **Integrated Repository Mapping via `.withMapper()`**
  - `createRepository(db, 'table').withMapper(mapper)` - Automatic DTO conversion
  - `MappedRepository` type - Repository that returns DTOs instead of rows
  - `Transformer<TRow, TDto>` interface - Contract for toDto/toRow transformations
  - `MappedInsertable` helper type - Proper typing for create operations
  - Works with `AutoMapper` (convention-based) and `CustomMapper` (explicit)
  - `.raw` property for unmapped repository access (escape hatch)
  - Chain with `.extend<T>().withMapper()` for typed complex queries returning DTOs
  - Criteria key conversion (camelCase → snake_case) for `count()`/`exists()`

- **Integration Tests for MappedRepository**
  - 22 integration tests against real PostgreSQL
  - Covers all repository operations with mapper transformations
  - Tests verify both return values AND database state

### Technical

- Proxy-based implementation with minimal overhead
- 27 unit tests for MappedRepository
- 22 integration tests (new)
- Total tests: 351 passing (329 unit + 22 integration)
- Coverage: 96.11% lines, 90.79% branches, 98.36% functions

## [0.3.5] - 2025-11-26

### Added

- **Type-Safe Complex Queries via `.extend<T>()`**
    - `createRepository(db, 'table').extend<Queries>()` - Add typed complex query methods
    - `ExtendableRepository` type - Repository with extend capability
    - Full autocomplete and type checking for multi-column finders, ordering, and comparison operators
    - No more `@ts-expect-error` needed for complex queries
    - Zero runtime overhead - extend() returns same repository instance
    - Fully backward compatible - existing code works unchanged

### Changed

- `createRepository` now returns `ExtendableRepository` (superset of `Repository`)

### Technical

- 12 new type-level tests for `.extend<T>()`
- 8 new runtime tests for extend behavior
- Total tests: 302 passing



## [0.3.4] - 2025-11-26

### Added

- **Type Unwrapping for Kysely Generated Types**
  - `Unwrap<T>` utility type - Extracts primitive types from `Generated<T>` and `ColumnType<>`
  - `UnwrapRow<Row>` utility type - Unwraps all fields in a database row type
  - Repository methods now accept and return unwrapped primitive types instead of Kysely wrappers
  - `findById(id: number)` instead of `findById(id: Generated<number>)`
  - All finder methods work with primitives (number, string, Date, boolean)
  - 33 new type-level tests verifying unwrapping behavior

### Changed

- **Breaking (Type-level only)**: Repository type signatures now use unwrapped types
  - Parameters accept primitives: `Unwrap<Row[K]>` instead of `Row[K]`
  - Return values use primitives: `UnwrapRow<Row>` instead of `Row`
  - `create()` and `createMany()` accept `Insertable<Row>` (correct Kysely type)
  - `update()` and `updateMany()` accept `Updateable<Row>` (correct Kysely type)
  - No runtime changes - purely compile-time improvements

### Fixed

- Updated test table types to properly use `Generated<T>` for auto-generated fields
- Fixed test mocks to use `UnwrapRow<T>` for returned data (represents SELECT results)
- Corrected custom ID column test to provide proper insertable data

### Technical

- Zero runtime overhead (compile-time only transformations)
- Backward compatible with simple types (non-Generated tables work unchanged)
- Total tests: 282 passing (33 new type-level tests)
- Coverage: 96.31% lines, 92.3% branches, 97.72% functions
- Performance benchmarks:
  - createMany (10k): ~118,000 ops/sec
  - findAllBy: ~247,000 ops/sec
  - count: ~4,139,000 ops/sec

## [0.3.3] - 2025-11-26

### Added

- **DTO Mapping System (Phase 1)**
  - `AutoMapper<TRow, TDto>` - Convention-based snake_case ↔ camelCase conversion
  - `CustomMapper<TRow, TDto>` - Explicit custom transformation logic
  - `Mapper<TRow, TDto>` interface - Common contract for all mappers
  - Utility functions: `toCamelCase()`, `toSnakeCase()`, `convertObjectKeys()`
  - Support for nested objects, arrays, and special types (Date, null, undefined)
  - 48 new tests (utils, AutoMapper, CustomMapper)
  - Phase 2 will integrate mappers into `createRepository()`

### Technical

- Extracted `toSnakeCase()` from parser to mapper utils (DRY)
- Total tests: 249 passing
- Coverage maintained at 98.84%

## [0.3.2] - 2025-11-26

### Fixed

- TypeScript autocomplete now suggests camelCase method names for snake_case columns
  - `kyc_status` → `findByKycStatus` (was: `findByKyc_status`)
  - Works with any depth: `api_v2_key` → `findByApiV2Key`

### Technical

- Added recursive `SnakeToCamelCase<S>` type utility
- Type-level only - zero runtime changes
- 23 new type tests, 201 total tests passing

## [0.1.0] - 2025-11-22

### Added

- **Repository Pattern**
  - `createRepository()` factory with auto-generated finder methods
  - Base CRUD operations: `findAll`, `findById`, `create`, `update`, `delete`, `save`
  - Derived finders: `findByX`, `findAllByX` parsed from method names at runtime
  - Comparison operators: `GreaterThan`, `LessThan`, `In`, `Like`, `IsNull`, `IsNotNull`
  - Ordering support: `OrderByXAsc`, `OrderByXDesc`
  - Pagination via `limit` and `offset` options

- **Batch Operations**
  - `createMany()` with parallel chunk execution
  - `updateMany()` for bulk updates
  - `deleteMany()` for bulk deletes
  - Configurable chunk size (default: 1000)
  - `skipReturn` option for faster inserts

- **Query Builder**
  - `query()` method returning Kysely SelectQueryBuilder
  - `raw()` for executing raw SQL
  - `count()` with optional criteria
  - `exists()` with efficient LIMIT 1

- **Database Utilities**
  - `createDatabase()` for PostgreSQL connections
  - `checkDatabaseHealth()` for health monitoring
  - `createLoggingPlugin()` for query logging with timing
  - `withTransaction()` for atomic operations

- **Developer Experience**
  - Full TypeScript type safety
  - Zero code generation (runtime Proxy)
  - Automatic camelCase to snake_case column mapping
  - Custom `RepositoryError` with error codes
  - Input validation for `createRepository()`

- **Documentation**
  - Comprehensive README with examples
  - Example project with migrations
  - JSDoc for all public APIs
