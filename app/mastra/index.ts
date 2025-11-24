import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { PgVector, PostgresStore } from "@mastra/pg";
import { ragAgent } from "./agents/rag-agent";

const globalForMastra = globalThis as unknown as {
  mastra: Mastra | undefined;
};

function createMastra() {
  return new Mastra({
    agents: { ragAgent },
    storage: new PostgresStore({
      connectionString: process.env.POSTGRES_URL!,
    }),
    vectors: {
      wasteCollectionStore: new PgVector({
        connectionString: process.env.POSTGRES_URL!,
      }),
    },
    logger: new PinoLogger({
      name: "Mastra",
      level: "info",
    }),
    telemetry: {
      enabled: false,
    },
    observability: {
      default: { enabled: process.env.NODE_ENV === 'production' },
    },
  });
}

export const mastra: Mastra = globalForMastra.mastra ?? createMastra();

if (process.env.NODE_ENV !== 'production') {
  globalForMastra.mastra = mastra;
}
