import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

// Prevent creating multiple connection pools in dev (hot reload)
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
  db: Database | undefined;
};

function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!globalForDb.pgClient) {
    globalForDb.pgClient = postgres(process.env.DATABASE_URL, { max: 3 });
  }

  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.pgClient, { schema });
  }

  return globalForDb.db;
}

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const database = getDatabase();
    const value = Reflect.get(database, prop, receiver);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
