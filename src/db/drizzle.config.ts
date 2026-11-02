import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.SQL_DATABASE_URL;

let dbCredentials: { url: string } | { host: string; user: string; password: string; database: string; ssl: false };
if (databaseUrl) {
  dbCredentials = { url: databaseUrl };
} else {
  const host = process.env.SQL_HOST;
  const database = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || '';

  if (!host || !database || !user) {
    throw new Error('Set DATABASE_URL or SQL_HOST, SQL_DB_NAME, and SQL_USER (SQL_PASSWORD is optional for peer authentication).');
  }

  dbCredentials = { host, user, password, database, ssl: false };
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials,
});
