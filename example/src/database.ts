import { createDatabase } from 'frix';
import type { Database } from './types.js';

export function getDatabase() {
  return createDatabase<Database>({
    host: 'localhost',
    port: 5432,
    user: 'frix',
    password: 'frix',
    database: 'frix_example',
  });
}
