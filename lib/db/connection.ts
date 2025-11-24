import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

export const client = globalForDb.client ?? postgres(process.env.POSTGRES_URL, {
  max: 1,
  idle_timeout: 0.001,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client);
