import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const refurbTable = pgTable("refurb_projects", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("planned"),
  budget: numeric("budget", { precision: 10, scale: 2 }).notNull(),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  contractor: text("contractor"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRefurbSchema = createInsertSchema(refurbTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRefurb = z.infer<typeof insertRefurbSchema>;
export type Refurb = typeof refurbTable.$inferSelect;
