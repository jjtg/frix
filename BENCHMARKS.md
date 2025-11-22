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
| createMany | 1,000 | ~25ms | ~40,000 |
| createMany | 10,000 | ~90ms | ~110,000 |
| createMany (parallel) | 5,000 | ~32ms | ~156,000 |
| findAllBy | 1,000 | ~4ms | ~250,000 |
| findAllBy (ordered) | 1,000 | ~4ms | ~250,000 |
| updateMany | 1,000 | ~5ms | ~200,000 |
| deleteMany | 1,000 | ~2ms | ~500,000 |
| count | 10,000 | ~2ms | ~4,000,000 |
| exists | 1 | ~3ms | ~330 |
| transaction (100 ops) | 100 | ~38ms | ~2,600 |
| complex query | 1 | ~3ms | ~360 |

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
