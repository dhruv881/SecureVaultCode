import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { documents, users, reminders, categories } from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema: { documents, users, reminders, categories } });