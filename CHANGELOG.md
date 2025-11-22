# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
