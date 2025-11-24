import { createTool } from '@mastra/core/tools';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const ragTool = createTool({
  id: 'search-waste-calendar',
  description: `Cerca nel calendario della raccolta differenziata 2025.

  IMPORTANTE:
  - Questo tool cerca date specifiche nel calendario
  - DEVI passare la data completa, la zona E il comune nel parametro query
  - Per cercare cosa si butta in una data, usa il formato: "YYYY-MM-DD zona X Comune"
    Esempio: "2025-11-10 zona B Piombino Dese"
  - Per cercare quando si butta un tipo di rifiuto, usa: "plastica zona X Comune"
    Esempio: "plastica zona A Asiago"

  Restituisce le informazioni su quali rifiuti vengono raccolti.`,

  inputSchema: z.object({
    query: z.string().describe('Query di ricerca. DEVE includere: 1) la data in formato YYYY-MM-DD (se cerchi per data), 2) la zona (A o B), 3) il nome del comune. Esempio: "2025-11-10 zona B Piombino Dese" oppure "plastica zona A Bassano del Grappa"'),
  }),

  outputSchema: z.object({
    results: z.array(z.string()).describe('Risultati trovati nel calendario'),
    found: z.boolean().describe('True se sono stati trovati risultati'),
  }),

  execute: async ({ context, mastra }) => {
    const { query } = context;

    logger.debug('RAG Tool called with query:', query);

    if (!mastra) {
      logger.error('RAG Tool error: Mastra instance not available');
      return {
        results: [],
        found: false,
      };
    }

    try {
      const vectorStore = mastra.getVector('wasteCollectionStore');

      // Generate embedding for the query
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: query,
      });

      // Search in vector store
      const results = await vectorStore.query({
        indexName: 'waste_collection_info',
        queryVector: embedding,
        topK: 5,
      });

      logger.debug('RAG Tool returned', results.length, 'results');

      if (results.length === 0) {
        return {
          results: [],
          found: false,
        };
      }

      // Extract text from results
      const textResults = results.map(r => r.metadata?.text || '').filter(Boolean);

      return {
        results: textResults,
        found: true,
      };

    } catch (error) {
      logger.error('RAG Tool error:', error);
      return {
        results: [],
        found: false,
      };
    }
  },
});
