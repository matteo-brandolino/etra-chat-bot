import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PgVector } from "@mastra/pg";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "@/lib/logger";

export const zoneCodeTool = createTool({
  id: "find-zone-collection-info",
  description: `Trova la zona di raccolta rifiuti per un indirizzo specifico.
Richiede indirizzo E comune. Restituisce l'identificativo zona (es: A, B, D, 5) da usare con ragTool.`,
  inputSchema: z.object({
    address: z.string().describe('Indirizzo (es: "Via Roma", "Corso IV Novembre")'),
    municipality: z.string().describe('Comune (es: "Asiago", "Piombino Dese")'),
  }),
  outputSchema: z.object({
    zone: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context: { address, municipality } }) => {
    try {
      logger.debug("Zone Code Tool:", { address, municipality });

      const pgVector = new PgVector({
        connectionString: process.env.POSTGRES_URL!,
      });

      const normalizedAddress = address.toUpperCase();
      const normalizedMunicipality = municipality.toUpperCase();
      const searchQuery = `${normalizedAddress} | ${normalizedMunicipality}`;

      const embeddingPromise = embed({
        value: searchQuery,
        model: openai.embedding("text-embedding-3-small"),
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Embedding timeout")), 10000)
      );

      const { embedding } = await Promise.race([embeddingPromise, timeoutPromise]) as any;

      const vectorResults = await pgVector.query({
        indexName: "waste_collection_zones",
        queryVector: embedding,
        topK: 3,
        includeVector: false,
      });

      logger.debug(`Vector search: ${vectorResults.length} results`);

      if (vectorResults.length === 0) {
        return {
          zone: "",
          error: `Indirizzo "${address}" non trovato in "${municipality}".`,
        };
      }

      let bestResult = null;
      let bestScore = 0;

      for (const result of vectorResults) {
        const text = result.metadata?.text || "";
        const parts = text.split("|").map((p: string) => p.trim());

        if (parts.length >= 4 && parts[1].toUpperCase() === normalizedMunicipality) {
          if (result.score > bestScore) {
            bestResult = result;
            bestScore = result.score;
          }
        }
      }

      if (!bestResult) {
        return {
          zone: "",
          error: `Indirizzo non trovato in "${municipality}".`,
        };
      }

      if (bestScore < 0.75) {
        const text = bestResult.metadata?.text || "";
        const parts = text.split("|").map((p: string) => p.trim());
        return {
          zone: "",
          error: `Match incerto (${(bestScore * 100).toFixed(1)}%): trovato "${parts[0]}".`,
        };
      }

      const text = bestResult.metadata?.text || "";
      const parts = text.split("|").map((p: string) => p.trim());
      const addressCode = parts[2];

      if (!addressCode) {
        return {
          zone: "",
          error: "Codice indirizzo non trovato.",
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      try {
        response = await fetch(
          "https://www.etraspa.it/ajax/action/get-modalita-conferimento-per-zone-rifiuti-per-via",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              via: addressCode,
              civico: "",
              barrato: "",
              tipoUtenza: "UTZ-D-1",
            }).toString(),
            signal: controller.signal,
          }
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        logger.error("ETRA API error:", fetchError);
        return {
          zone: "",
          error: "Errore chiamata API ETRA",
        };
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        return {
          zone: "",
          error: `Errore API ETRA: ${response.status}`,
        };
      }

      const collectionInfo = await response.text();
      const rowRegex = /<tr>\s*<td>([^<]+)<\/td>\s*<td class="center">([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;

      let match;
      let zone = "";

      while ((match = rowRegex.exec(collectionInfo)) !== null) {
        const potentialZone = match[2].trim();
        if (potentialZone && potentialZone !== "-") {
          zone = potentialZone;
          break;
        }
      }

      if (!zone) {
        return {
          zone: "",
          error: "Zona non trovata per questo indirizzo.",
        };
      }

      logger.success("Zona trovata:", zone);
      return { zone };
    } catch (error) {
      logger.error("Zone Code Tool error:", error);
      return {
        zone: "",
        error: `Errore: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
