import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { PgVector, PostgresStore } from "@mastra/pg";
import { ragAgent } from "./agents/rag-agent";

export const mastra = new Mastra({
  agents: { ragAgent },
  storage: new PostgresStore({
    connectionString: "postgresql://etra:etra_password@localhost:5432/etra_rag",
  }),
  vectors: {
    wasteCollectionStore: new PgVector({
      connectionString:
        "postgresql://etra:etra_password@localhost:5432/etra_rag",
    }),
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Disabilita in development per evitare l'errore "already registered" durante hot reload
    // Abilita solo in production
    default: { enabled: process.env.NODE_ENV === 'production' },
  },
});
