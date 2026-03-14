import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent creating multiple connection pools in dev (hot reload)
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!globalForDb.pgClient) {
    globalForDb.pgClient = postgres(process.env.DATABASE_URL, { max: 3 });
  }

  return drizzle(globalForDb.pgClient, { schema });
}

export const db = getDatabase();
