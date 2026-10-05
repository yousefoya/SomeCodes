import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from '../config/database.js';
import * as schema from './schema/index.js';

export const db = drizzle(sql, { schema });
export { schema };
