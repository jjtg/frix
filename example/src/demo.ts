import type { TransactionScope } from 'frix';
import { checkDatabaseHealth, withTransaction } from 'frix';
import { getDatabase } from './database';
import type { Database } from './types';
import { createUserRepository, createPostRepository } from './repositories';

async function main(): Promise<void> {
  console.log('=== Frix Library Demo ===\n');

  // Setup database connection
  const db = getDatabase();

  // Health check
  const health = await checkDatabaseHealth(db);
  console.log(`Database health: ${health.healthy ? 'OK' : 'FAILED'}`);
  if (!health.healthy) {
    console.error('Database connection failed. Make sure PostgreSQL is running.');
    process.exit(1);
  }

  // Create repositories
  const userRepo = createUserRepository(db);
  const postRepo = createPostRepository(db);

  // Clean up any existing data
  await postRepo.deleteMany({});
  await userRepo.deleteMany({});

  // ========================================
  // 1. Basic CRUD Operations
  // ========================================
  console.log('\n--- 1. Basic CRUD Operations ---\n');

  // Create
  const alice = await userRepo.create({
    email: 'alice@example.com',
    name: 'Alice Johnson',
    status: 'ACTIVE',
  });
  console.log('Created user:', alice);

  // Read by ID
  const foundUser = await userRepo.findById(alice.id);
  console.log('Found by ID:', foundUser?.name);

  // Update
  const updated = await userRepo.update(alice.id, { name: 'Alice Smith' });
  console.log('Updated name:', updated?.name);

  // Save (upsert)
  const saved = await userRepo.save({ ...alice, name: 'Alice Williams' });
  console.log('Saved (upsert):', saved.name);

  // Find all
  const allUsers = await userRepo.findAll();
  console.log('Total users:', allUsers.length);

  // ========================================
  // 2. Derived Finders
  // ========================================
  console.log('\n--- 2. Derived Finders ---\n');

  // Create more users for testing
  await userRepo.create({ email: 'bob@example.com', name: 'Bob Brown', status: 'ACTIVE' });
  await userRepo.create({ email: 'charlie@example.com', name: 'Charlie Davis', status: 'INACTIVE' });

  // Single column finder
  const byEmail = await userRepo.findByEmail('bob@example.com');
  console.log('findByEmail:', byEmail?.name);

  // Multi-result finder
  const activeUsers = await userRepo.findAllByStatus('ACTIVE');
  console.log('findAllByStatus (ACTIVE):', activeUsers.map((u) => u.name));

  // Multi-column finder
  const specific = await userRepo.findByEmailAndStatus('bob@example.com', 'ACTIVE');
  console.log('findByEmailAndStatus:', specific?.name);

  // ========================================
  // 3. Comparison Operators
  // ========================================
  console.log('\n--- 3. Comparison Operators ---\n');

  // Greater than
  const gtUsers = await userRepo.findAllByIdGreaterThan(1);
  console.log('findAllByIdGreaterThan(1):', gtUsers.length, 'users');

  // IN operator
  const inUsers = await userRepo.findAllByStatusIn(['ACTIVE', 'INACTIVE']);
  console.log('findAllByStatusIn:', inUsers.length, 'users');

  // LIKE operator
  const likeUsers = await userRepo.findAllByEmailLike('%@example.com');
  console.log('findAllByEmailLike:', likeUsers.length, 'users');

  // ========================================
  // 4. Ordering and Pagination
  // ========================================
  console.log('\n--- 4. Ordering and Pagination ---\n');

  // Order by name ascending
  const orderedUsers = await userRepo.findAllByStatusOrderByNameAsc('ACTIVE');
  console.log('Ordered by name:', orderedUsers.map((u) => u.name));

  // Order by name descending
  const descUsers = await userRepo.findAllByStatusOrderByNameDesc('ACTIVE');
  console.log('Ordered desc:', descUsers.map((u) => u.name));

  // Pagination (with options)
  const paginated = await userRepo.findAllByStatus('ACTIVE', { limit: 1, offset: 1 });
  console.log('Paginated (limit 1, offset 1):', paginated.map((u) => u.name));

  // ========================================
  // 5. Batch Operations
  // ========================================
  console.log('\n--- 5. Batch Operations ---\n');

  // Create many
  const newUsers = await userRepo.createMany([
    { email: 'user1@test.com', name: 'Test User 1', status: 'ACTIVE' },
    { email: 'user2@test.com', name: 'Test User 2', status: 'ACTIVE' },
    { email: 'user3@test.com', name: 'Test User 3', status: 'INACTIVE' },
  ]);
  console.log('createMany:', newUsers.length, 'users created');

  // Create many with skipReturn (for performance)
  const countResult = await userRepo.createMany(
    [
      { email: 'batch1@test.com', name: 'Batch 1', status: 'ACTIVE' },
      { email: 'batch2@test.com', name: 'Batch 2', status: 'ACTIVE' },
    ],
    { skipReturn: true }
  );
  console.log('createMany (skipReturn):', countResult);

  // Update many
  const updatedCount = await userRepo.updateMany(
    { status: 'INACTIVE' },
    { status: 'ACTIVE' }
  );
  console.log('updateMany (INACTIVE -> ACTIVE):', updatedCount, 'rows updated');

  // Delete many
  const deletedCount = await userRepo.deleteMany({ email: 'batch1@test.com' });
  console.log('deleteMany:', deletedCount, 'rows deleted');

  // ========================================
  // 6. Query Builder Extensions
  // ========================================
  console.log('\n--- 6. Query Builder Extensions ---\n');

  // Count
  const totalCount = await userRepo.count();
  console.log('count() all:', totalCount);

  const activeCount = await userRepo.count({ status: 'ACTIVE' });
  console.log('count() active:', activeCount);

  // Exists
  const hasUsers = await userRepo.exists();
  console.log('exists():', hasUsers);

  const hasInactive = await userRepo.exists({ status: 'INACTIVE' });
  console.log('exists({ status: INACTIVE }):', hasInactive);

  // Custom query with builder
  const customResults = await userRepo.query()
    .where('name', 'like', '%User%')
    .orderBy('name', 'asc')
    .limit(2)
    .execute();
  console.log('Custom query:', customResults.map((u) => u.name));

  // ========================================
  // 7. Transactions
  // ========================================
  console.log('\n--- 7. Transactions ---\n');

  // Get a user for posts
  const author = await userRepo.findByEmail('alice@example.com');

  if (author) {
    const authorId = author.id.__select__;

    await withTransaction(db, async (scope: TransactionScope<Database>) => {
      const trxUserRepo = scope.getRepository('users');
      const trxPostRepo = scope.getRepository('posts');

      // Create posts atomically
      const post1 = await trxPostRepo.create({
        user_id: authorId,
        title: 'First Post',
        content: 'Hello World!',
      });
      console.log('Created post in transaction:', post1.title);

      const post2 = await trxPostRepo.create({
        user_id: authorId,
        title: 'Second Post',
        content: 'More content here',
      });
      console.log('Created post in transaction:', post2.title);

      // Update user in same transaction
      await trxUserRepo.update(author.id, { name: 'Alice (Author)' });
      console.log('Updated user in transaction');
    });

    // Verify outside transaction
    const posts = await postRepo.findAllByUserId(authorId);
    console.log('Posts after transaction:', posts.length);
  }

  // ========================================
  // Summary
  // ========================================
  console.log('\n--- Summary ---\n');

  const finalUserCount = await userRepo.count();
  const finalPostCount = await postRepo.count();
  console.log(`Total users: ${finalUserCount}`);
  console.log(`Total posts: ${finalPostCount}`);

  // Cleanup
  await db.destroy();
  console.log('\n=== Demo Complete ===');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
