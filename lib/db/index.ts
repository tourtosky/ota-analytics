import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create a postgres connection
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  // Create drizzle instance
  return drizzle(client, { schema });
}

// Export db instance - will be created on first use
export const db = getDatabase();
