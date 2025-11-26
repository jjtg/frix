import type { TransactionScope } from 'frix';
import { checkDatabaseHealth, withTransaction, RepositoryError } from 'frix';
import { getDatabase } from './database.js';
import type { Database } from './types.js';
import { createUserRepository, createPostRepository } from './repositories/index.js';
import { userAutoMapper, userSummaryMapper, postAutoMapper } from './mappers/index.js';

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    FRIX LIBRARY DEMO                         ║');
  console.log('║         Comprehensive showcase of all features               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ========================================
  // 1. Database Connection with Logging
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. DATABASE CONNECTION (createDatabase + Logging Plugin)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Enable logging to see SQL queries in console
  const db = getDatabase(true); // Pass true to enable query logging
  console.log('Database connection created with logging enabled.\n');
  console.log('TIP: Watch for [QUERY] logs showing SQL and execution time.\n');

  // ========================================
  // 2. Health Check
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2. HEALTH CHECK (checkDatabaseHealth)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const health = await checkDatabaseHealth(db);
  console.log(`Database health: ${health.healthy ? '✓ OK' : '✗ FAILED'}`);
  if (!health.healthy) {
    console.error('Database connection failed. Make sure PostgreSQL is running.');
    console.error('Run: docker-compose up -d');
    process.exit(1);
  }
  console.log();

  // ========================================
  // 3. Create Repositories with .extend<T>()
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3. TYPE-SAFE REPOSITORIES (.extend<T>())');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Creating repositories with custom query methods...');
  console.log('  const userRepo = createRepository(db, "users").extend<UserQueries>();');
  console.log('  const postRepo = createRepository(db, "posts").extend<PostQueries>();\n');

  const userRepo = createUserRepository(db);
  const postRepo = createPostRepository(db);

  console.log('Repositories created! All methods are fully typed with autocomplete.\n');

  // Clean up any existing data
  await postRepo.deleteMany({});
  await userRepo.deleteMany({});
  console.log('Cleaned up existing data.\n');

  // ========================================
  // 4. Basic CRUD Operations
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4. BASIC CRUD OPERATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create
  console.log('CREATE - userRepo.create({ email, name, status })');
  const alice = await userRepo.create({
    email: 'alice@example.com',
    name: 'Alice Johnson',
    status: 'ACTIVE',
  });
  console.log('  Created:', { id: alice.id, name: alice.name, email: alice.email });

  // Read by ID
  console.log('\nFIND BY ID - userRepo.findById(id)');
  const foundUser = await userRepo.findById(alice.id);
  console.log('  Found:', foundUser?.name);

  // Update
  console.log('\nUPDATE - userRepo.update(id, { name })');
  const updated = await userRepo.update(alice.id, { name: 'Alice Smith' });
  console.log('  Updated name:', updated?.name);

  // Save (upsert)
  console.log('\nSAVE (UPSERT) - userRepo.save({ ...user, name })');
  const saved = await userRepo.save({ ...alice, name: 'Alice Williams' });
  console.log('  Saved:', saved.name);

  // Find all
  console.log('\nFIND ALL - userRepo.findAll()');
  const allUsers = await userRepo.findAll();
  console.log('  Total users:', allUsers.length);
  console.log();

  // ========================================
  // 5. Derived Finders (Auto-implemented)
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5. DERIVED FINDERS (Auto-implemented from method names)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create more test users
  await userRepo.create({ email: 'bob@example.com', name: 'Bob Brown', status: 'ACTIVE' });
  await userRepo.create({ email: 'charlie@example.com', name: 'Charlie Davis', status: 'INACTIVE' });

  // Single column finder
  console.log('findByEmail("bob@example.com")');
  const byEmail = await userRepo.findByEmail('bob@example.com');
  console.log('  Found:', byEmail?.name);

  // Multi-result finder
  console.log('\nfindAllByStatus("ACTIVE")');
  const activeUsers = await userRepo.findAllByStatus('ACTIVE');
  console.log('  Found:', activeUsers.map((u) => u.name));

  // Multi-column finder (AND condition)
  console.log('\nfindByEmailAndStatus("bob@example.com", "ACTIVE")');
  const specific = await userRepo.findByEmailAndStatus('bob@example.com', 'ACTIVE');
  console.log('  Found:', specific?.name);
  console.log();

  // ========================================
  // 6. Comparison Operators
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('6. COMPARISON OPERATORS (GreaterThan, In, Like, etc.)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Greater than
  console.log('findAllByIdGreaterThan(1)');
  const gtUsers = await userRepo.findAllByIdGreaterThan(1);
  console.log('  Found:', gtUsers.length, 'users with id > 1');

  // IN operator
  console.log('\nfindAllByStatusIn(["ACTIVE", "INACTIVE"])');
  const inUsers = await userRepo.findAllByStatusIn(['ACTIVE', 'INACTIVE']);
  console.log('  Found:', inUsers.length, 'users');

  // LIKE operator
  console.log('\nfindAllByEmailLike("%@example.com")');
  const likeUsers = await userRepo.findAllByEmailLike('%@example.com');
  console.log('  Found:', likeUsers.length, 'users matching pattern');
  console.log();

  // ========================================
  // 7. Ordering and Pagination
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('7. ORDERING AND PAGINATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Order by name ascending
  console.log('findAllByStatusOrderByNameAsc("ACTIVE")');
  const orderedUsers = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');
  console.log('  Ordered:', orderedUsers.map((u) => u.name));

  // Order by name descending
  console.log('\nfindAllByStatusOrderByNameDesc("ACTIVE")');
  const descUsers = await userRepo.findAllByStatusOrderByNameDesc('ACTIVE');
  console.log('  Ordered:', descUsers.map((u) => u.name));

  // Pagination (with options)
  console.log('\nfindAllByStatus("ACTIVE", { limit: 1, offset: 1 })');
  const paginated = await userRepo.findAllByStatus('ACTIVE', { limit: 1, offset: 1 });
  console.log('  Page 2 (1 item):', paginated.map((u) => u.name));
  console.log();

  // ========================================
  // 8. Batch Operations
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('8. BATCH OPERATIONS (createMany, updateMany, deleteMany)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create many
  console.log('createMany([user1, user2, user3])');
  const newUsers = await userRepo.createMany([
    { email: 'user1@test.com', name: 'Test User 1', status: 'ACTIVE' },
    { email: 'user2@test.com', name: 'Test User 2', status: 'ACTIVE' },
    { email: 'user3@test.com', name: 'Test User 3', status: 'INACTIVE' },
  ]);
  console.log('  Created:', newUsers.length, 'users');

  // Create many with skipReturn (for performance)
  console.log('\ncreateMany([...], { skipReturn: true }) - Returns count only');
  const countResult = await userRepo.createMany(
    [
      { email: 'batch1@test.com', name: 'Batch 1', status: 'ACTIVE' },
      { email: 'batch2@test.com', name: 'Batch 2', status: 'ACTIVE' },
    ],
    { skipReturn: true }
  );
  console.log('  Count:', countResult);

  // Update many
  console.log('\nupdateMany({ status: "INACTIVE" }, { status: "ACTIVE" })');
  const updatedCount = await userRepo.updateMany({ status: 'INACTIVE' }, { status: 'ACTIVE' });
  console.log('  Updated:', updatedCount, 'rows');

  // Delete many
  console.log('\ndeleteMany({ email: "batch1@test.com" })');
  const deletedCount = await userRepo.deleteMany({ email: 'batch1@test.com' });
  console.log('  Deleted:', deletedCount, 'rows');
  console.log();

  // ========================================
  // 9. Query Builder Extensions
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('9. QUERY BUILDER (count, exists, query())');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Count
  console.log('count() - All users');
  const totalCount = await userRepo.count();
  console.log('  Total:', totalCount);

  console.log('\ncount({ status: "ACTIVE" }) - Active users');
  const activeCount = await userRepo.count({ status: 'ACTIVE' });
  console.log('  Active:', activeCount);

  // Exists
  console.log('\nexists() - Any users?');
  const hasUsers = await userRepo.exists();
  console.log('  Exists:', hasUsers);

  console.log('\nexists({ status: "INACTIVE" }) - Any inactive?');
  const hasInactive = await userRepo.exists({ status: 'INACTIVE' });
  console.log('  Exists:', hasInactive);

  // Custom query with builder
  console.log('\nquery().where(...).orderBy(...).limit(...).execute()');
  const customResults = await userRepo
    .query()
    .where('name', 'like', '%User%')
    .orderBy('name', 'asc')
    .limit(2)
    .execute();
  console.log('  Custom query results:', customResults.map((u) => u.name));
  console.log();

  // ========================================
  // 10. DTO Mapping
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('10. DTO MAPPING (AutoMapper, CustomMapper)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get a user for mapping demo
  const userForMapping = await userRepo.findByEmail('alice@example.com');
  if (userForMapping) {
    // AutoMapper: snake_case -> camelCase
    console.log('AutoMapper - Convention-based snake_case <-> camelCase');
    console.log('  Database row:', {
      id: userForMapping.id,
      created_at: userForMapping.created_at,
    });
    const userDto = userAutoMapper.toDto(userForMapping);
    console.log('  DTO (camelCase):', { id: userDto.id, createdAt: userDto.createdAt });

    // CustomMapper: Custom transformation
    console.log('\nCustomMapper - Custom transformation logic');
    const userSummary = userSummaryMapper.toDto(userForMapping);
    console.log('  User summary:', userSummary);

    // Batch mapping (use map() to convert arrays)
    console.log('\nBatch mapping - using map()');
    const usersToMap = await userRepo.findAllByStatus('ACTIVE');
    const userDtos = usersToMap.map((u) => userAutoMapper.toDto(u));
    console.log('  Mapped', userDtos.length, 'users to DTOs');
  }
  console.log();

  // ========================================
  // 11. Transactions
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('11. TRANSACTIONS (withTransaction)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const author = await userRepo.findByEmail('alice@example.com');

  if (author) {
    const authorId = author.id;

    console.log('Starting transaction...');
    await withTransaction(db, async (scope: TransactionScope<Database>) => {
      const trxUserRepo = scope.getRepository('users');
      const trxPostRepo = scope.getRepository('posts');

      // Create posts atomically
      const post1 = await trxPostRepo.create({
        user_id: authorId,
        title: 'First Post',
        content: 'Hello World!',
        published: true,
      });
      console.log('  Created post:', post1.title);

      const post2 = await trxPostRepo.create({
        user_id: authorId,
        title: 'Second Post',
        content: 'More content here',
        published: false,
      });
      console.log('  Created post:', post2.title);

      // Update user in same transaction
      await trxUserRepo.update(author.id, { name: 'Alice (Author)' });
      console.log('  Updated user name');
    });

    console.log('Transaction committed successfully!');

    // Verify outside transaction
    const posts = await postRepo.findAllByUserId(authorId);
    console.log('  Posts after transaction:', posts.length);

    // Test extended post queries
    console.log('\nPost repository extended queries:');
    const publishedPosts = await postRepo.findAllByPublished(true);
    console.log('  Published posts:', publishedPosts.length);

    const userPublished = await postRepo.findAllByUserIdAndPublished(authorId, true);
    console.log('  User published posts:', userPublished.length);

    // Post DTO mapping
    console.log('\nPost DTO mapping:');
    const postDto = postAutoMapper.toDto(posts[0]);
    console.log('  Post DTO:', { id: postDto.id, userId: postDto.userId, title: postDto.title });
  }
  console.log();

  // ========================================
  // 12. Error Handling
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('12. ERROR HANDLING (RepositoryError)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Attempting to find non-existent user...');
  const notFound = await userRepo.findById(999999);
  console.log('  findById(999999):', notFound ?? 'undefined (not found)');

  console.log('\nTrying to create duplicate email...');
  try {
    await userRepo.create({
      email: 'alice@example.com', // Already exists
      name: 'Duplicate Alice',
      status: 'ACTIVE',
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      console.log('  RepositoryError caught!');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message.substring(0, 50) + '...');
    }
  }
  console.log();

  // ========================================
  // Summary
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const finalUserCount = await userRepo.count();
  const finalPostCount = await postRepo.count();
  console.log(`Total users: ${finalUserCount}`);
  console.log(`Total posts: ${finalPostCount}`);

  // Cleanup
  await db.destroy();
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     DEMO COMPLETE                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
