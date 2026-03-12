import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "@/lib/db";
import { scrapedPages } from "@/lib/db/schema";

(async () => {
  const result = await db.delete(scrapedPages).execute();
  console.log("Cache cleared");
  process.exit(0);
})();
