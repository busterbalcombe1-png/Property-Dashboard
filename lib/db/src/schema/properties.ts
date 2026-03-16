import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  propertyType: text("property_type").notNull(),
  bedrooms: integer("bedrooms").notNull().default(1),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 12, scale: 2 }).notNull(),
  monthlyRent: numeric("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  monthlyMortgage: numeric("monthly_mortgage", { precision: 10, scale: 2 }).notNull(),
  monthlyExpenses: numeric("monthly_expenses", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("vacant"),
  purchaseDate: text("purchase_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
