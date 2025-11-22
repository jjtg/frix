import { defineConfig } from 'kysely-ctl';
import { PostgresDialect } from 'kysely';
import pg from 'pg';

export default defineConfig({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      host: 'localhost',
      port: 5432,
      user: 'frix',
      password: 'frix',
      database: 'frix_example',
    }),
  }),
  migrations: {
    migrationFolder: 'migrations',
  },
});
