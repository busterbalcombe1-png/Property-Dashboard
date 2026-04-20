import { pgTable, serial, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const operatingCostsTable = pgTable("operating_costs", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  billingPeriod: text("billing_period").notNull().default("monthly"),
  paidBy: text("paid_by").notNull().default("me"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OperatingCost = typeof operatingCostsTable.$inferSelect;
