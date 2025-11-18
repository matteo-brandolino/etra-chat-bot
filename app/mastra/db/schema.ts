import { pgTable, text, vector, jsonb } from "drizzle-orm/pg-core";

// Schema per la tabella waste_collection creata da pgVector
export const wasteCollection = pgTable("waste_collection", {
  id: text("id").primaryKey(),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata"),
});

// Puoi aggiungere altri schemi qui se necessario
