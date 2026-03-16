import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const valuationsTable = pgTable("property_valuations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  valuationDate: text("valuation_date").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  source: text("source").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertValuationSchema = createInsertSchema(valuationsTable).omit({ id: true, createdAt: true });
export type InsertValuation = z.infer<typeof insertValuationSchema>;
export type Valuation = typeof valuationsTable.$inferSelect;
