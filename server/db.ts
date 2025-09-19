import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import pg from "pg";
import { documents, users, reminders, categories } from "@shared/schema";

// Support both Neon and local PostgreSQL
const databaseUrl = process.env.DATABASE_URL!;

let db;

if (databaseUrl.includes('neon.tech')) {
  // Use Neon serverless driver
  const sql = neon(databaseUrl);
  db = drizzle(sql, { schema: { documents, users, reminders, categories } });
} else {
  // Use standard PostgreSQL driver for local database
  const pool = new pg.Pool({
    connectionString: databaseUrl,
  });
  db = drizzleNode(pool, { schema: { documents, users, reminders, categories } });
}

export { db };