import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PgVector } from "@mastra/pg";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "@/lib/logger";

export const zoneCodeTool = createTool({
  id: "find-zone-collection-info",
  description: `
    Finds the waste collection zone for a specific address and municipality.
    Use this tool when the user asks about waste collection for a specific address.

    IMPORTANT: This tool requires BOTH address AND municipality from the user.
    If the user doesn't provide the municipality, you MUST ask them before calling this tool.

    This tool returns ONLY the zone identifier (e.g., "A", "B", "D", "5") which you can then use
    to query the ragTool to find the specific collection calendar for that zone.

    Examples of when to use it:
    - User provides full address with city -> Get zone first, then query calendar with ragTool
    - User asks about waste collection for their street -> Ask for municipality if not provided, then get zone
    - User wants to know collection schedule for specific location -> Verify you have both address and city, then proceed
  `,
  inputSchema: z.object({
    address: z
      .string()
      .describe(
        'Street address (e.g., "Via Roma", "Corso IV Novembre", "Piazza Garibaldi")'
      ),
    municipality: z
      .string()
      .describe(
        'Municipality name (e.g., "Asiago", "Bassano del Grappa", "Piombino Dese")'
      ),
  }),
  outputSchema: z.object({
    zone: z
      .string()
      .describe(
        'Collection zone identifier (e.g., "A", "B", "D", "5"). Use this to query the ragTool for the specific collection calendar.'
      ),
    error: z
      .string()
      .optional()
      .describe("Error message if zone cannot be found"),
  }),
  execute: async ({ context: { address, municipality } }) => {
    try {
      logger.debug("Zone Code Tool called with:", { address, municipality });

      // 1. Initialize PgVector
      const pgVector = new PgVector({
        connectionString: process.env.POSTGRES_URL!,
      });

      // 2. Normalize and combine address and municipality for vector search
      // Convert to uppercase to match the format in the database
      const normalizedAddress = address.toUpperCase();
      const normalizedMunicipality = municipality.toUpperCase();
      const searchQuery = `${normalizedAddress} | ${normalizedMunicipality}`;

      logger.debug("Generating embedding for query:", searchQuery);

      const embeddingPromise = embed({
        value: searchQuery,
        model: openai.embedding("text-embedding-3-small"),
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Embedding timeout after 10s")), 10000)
      );

      const { embedding } = await Promise.race([
        embeddingPromise,
        timeoutPromise,
      ]) as any;

      logger.debug("Embedding generated, querying vector database");

      // 3. Query the zones index to find matches
      let vectorResults;
      try {
        logger.debug("Executing pgVector.query with:", {
          indexName: "waste_collection_zones",
          embeddingLength: embedding.length,
          topK: 3,
        });

        vectorResults = await pgVector.query({
          indexName: "waste_collection_zones",
          queryVector: embedding,
          topK: 3,
          includeVector: false,
        });

        logger.debug(`Vector search returned ${vectorResults.length} results`);
      } catch (queryError) {
        logger.error("Error querying vector database:", queryError);
        return {
          zone: "",
          error: `Database query failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`,
        };
      }

      if (vectorResults.length === 0) {
        return {
          zone: "",
          error: `No address found for "${address}" in "${municipality}". Please verify the address and municipality name.`,
        };
      }

      // 4. Filter results to find exact municipality match
      let bestResult = null;
      let bestScore = 0;

      for (const result of vectorResults) {
        const text = result.metadata?.text || "";
        const parts = text.split("|").map((p: string) => p.trim());

        if (parts.length >= 4) {
          const resultMunicipality = parts[1];

          // Check if municipality matches
          if (resultMunicipality.toUpperCase() === normalizedMunicipality) {
            // This result is from the correct municipality
            if (result.score > bestScore) {
              bestResult = result;
              bestScore = result.score;
            }
          }
        }
      }

      if (!bestResult) {
        logger.debug(
          "No match found for municipality:",
          normalizedMunicipality
        );
        logger.debug("Top results were:");
        vectorResults.slice(0, 3).forEach((r, i) => {
          const text = r.metadata?.text || "";
          logger.debug(
            `   ${i + 1}. ${text.substring(0, 80)} (score: ${r.score})`
          );
        });

        return {
          zone: "",
          error: `No address found for "${address}" in "${municipality}". Please verify the address and municipality name.`,
        };
      }

      // Check confidence threshold
      if (bestScore < 0.75) {
        logger.warn("Low confidence match:", bestScore);
        const text = bestResult.metadata?.text || "";
        const parts = text.split("|").map((p: string) => p.trim());
        return {
          zone: "",
          error: `Low confidence match (${(bestScore * 100).toFixed(1)}%) for "${address}" in "${municipality}". Found "${parts[0]}" instead. Please verify the address spelling.`,
        };
      }

      // With line-by-line ingestion, each result is exactly one address
      const text = bestResult.metadata?.text || "";

      logger.debug("Best match:", text);
      logger.debug("Confidence score:", bestScore);

      // Format: INDIRIZZO | COMUNE | CODICE_INDIRIZZO | CODICE_COMUNE
      const parts = text.split("|").map((p: string) => p.trim());

      const foundAddress = parts[0];
      const foundMunicipality = parts[1];
      const addressCode = parts[2];

      logger.debug("Found:", {
        address: foundAddress,
        municipality: foundMunicipality,
        addressCode,
      });

      if (!addressCode) {
        return {
          zone: "",
          error:
            "Address code not found. Try to be more specific with the address.",
        };
      }

      // 5. Call ETRA API with the address code
      const apiParams = {
        via: addressCode,
        civico: "",
        barrato: "",
        tipoUtenza: "UTZ-D-1",
      };

      logger.debug("Calling ETRA API with params:", apiParams);

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let response;
      try {
        response = await fetch(
          "https://www.etraspa.it/ajax/action/get-modalita-conferimento-per-zone-rifiuti-per-via",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(apiParams).toString(),
            signal: controller.signal,
          }
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        logger.error("ETRA API call failed:", fetchError);
        return {
          zone: "",
          error: `ETRA API call failed: ${fetchError instanceof Error ? fetchError.message : "Timeout or network error"}`,
        };
      } finally {
        clearTimeout(timeoutId);
      }

      logger.debug("ETRA API response status:", response.status);

      if (!response.ok) {
        return {
          zone: "",
          error: `Error calling ETRA API: ${response.status}`,
        };
      }

      const collectionInfo = await response.text();
      logger.debug("ETRA API response length:", collectionInfo.length);

      // 6. Parse HTML table to extract zone from first row with valid zone (not "-")
      const rowRegex =
        /<tr>\s*<td>([^<]+)<\/td>\s*<td class="center">([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;

      let match;
      let zone = "";

      // Find first row with a valid zone (not "-")
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
          error: "No valid zone found for this address.",
        };
      }

      logger.success("Zone found:", zone);

      return { zone };
    } catch (error) {
      return {
        zone: "",
        error: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
