# Benchmarks

Performance benchmarks for Frix repository operations.

## Test Environment

- Node.js: v20.x
- PostgreSQL: 16 (Docker)
- Hardware: Results will vary based on your system

## Results

Results from `npm run benchmark` (tests/integration/performance.test.ts):

| Operation | Records | Duration | Ops/sec |
|-----------|---------|----------|---------|
| createMany | 1,000 | ~26ms | ~39,000 |
| createMany | 10,000 | ~85ms | ~118,000 |
| createMany (parallel) | 5,000 | ~32ms | ~159,000 |
| findAllBy | 1,000 | ~5ms | ~220,000 |
| findAllBy (ordered) | 1,000 | ~4ms | ~247,000 |
| updateMany | 1,000 | ~5ms | ~207,000 |
| deleteMany | 1,000 | ~2ms | ~621,000 |
| count | 10,000 | ~2ms | ~4,139,000 |
| exists | 1 | ~3ms | ~399 |
| transaction (100 ops) | 100 | ~32ms | ~3,150 |
| complex query | 1 | ~3ms | ~359 |

## Running Benchmarks

```bash
# Start test database
docker compose -f docker-compose.test.yml up -d

# Run benchmarks
npm run benchmark

# Stop test database
docker compose -f docker-compose.test.yml down
```

## Notes

- Results vary based on hardware and PostgreSQL configuration
- Benchmarks use a local Docker PostgreSQL instance
- Connection pooling is enabled by default
- The `createMany` operation uses chunked inserts for large datasets
- Parallel execution can significantly improve throughput for bulk operations
