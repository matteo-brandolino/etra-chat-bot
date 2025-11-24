import { createTool } from '@mastra/core/tools';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const ragTool = createTool({
  id: 'search-waste-calendar',
  description: `Cerca nel calendario della raccolta differenziata 2025.
Formato query: "YYYY-MM-DD zona X Comune" per date specifiche, o "plastica zona A Comune" per tipo di rifiuto.`,

  inputSchema: z.object({
    query: z.string().describe('Query con data (YYYY-MM-DD), zona (A/B) e comune. Es: "2025-11-10 zona B Piombino Dese"'),
  }),

  outputSchema: z.object({
    results: z.array(z.string()),
    found: z.boolean(),
  }),

  execute: async ({ context, mastra }) => {
    const { query } = context;
    logger.debug('RAG Tool called with query:', query);

    if (!mastra) {
      logger.error('RAG Tool: Mastra instance not available');
      return { results: [], found: false };
    }

    try {
      const vectorStore = mastra.getVector('wasteCollectionStore');
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: query,
      });

      const results = await vectorStore.query({
        indexName: 'waste_collection_info',
        queryVector: embedding,
        topK: 5,
      });

      logger.debug('RAG Tool returned', results.length, 'results');

      if (results.length === 0) {
        return { results: [], found: false };
      }

      const textResults = results
        .map(r => r.metadata?.text || '')
        .filter(Boolean);

      return { results: textResults, found: true };
    } catch (error) {
      logger.error('RAG Tool error:', error);
      return { results: [], found: false };
    }
  },
});
