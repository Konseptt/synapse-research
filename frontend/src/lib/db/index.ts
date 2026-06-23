import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function getConnectionString(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL;

  if (!url && process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    console.error("[synapse] DATABASE_URL is not set in production.");
  }

  return url ?? "postgresql://synapse:synapse@localhost:5432/synapse";
}

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

function getClient() {
  if (!globalForDb.postgresClient) {
    globalForDb.postgresClient = postgres(getConnectionString(), {
      prepare: false,
      max: process.env.VERCEL ? 1 : 10,
    });
  }
  return globalForDb.postgresClient;
}

export const db = drizzle(getClient(), { schema });
