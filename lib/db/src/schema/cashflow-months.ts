import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const cashflowMonthsTable = pgTable("cashflow_months", {
  id: serial("id").primaryKey(),
  month: text("month").notNull().unique(),
  income: numeric("income", { precision: 12, scale: 2 }).notNull().default("0"),
  expenses: numeric("expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CashflowMonth = typeof cashflowMonthsTable.$inferSelect;
