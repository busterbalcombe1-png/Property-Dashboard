import { pgTable, serial, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const dealsTable = pgTable("deals", {
  id:           serial("id").primaryKey(),
  rightmoveUrl: text("rightmove_url"),
  address:      text("address").notNull().default(""),
  askingPrice:  numeric("asking_price", { precision: 12, scale: 2 }),
  propertyType: text("property_type"),
  bedrooms:     integer("bedrooms"),
  status:       text("status").notNull().default("criteria_check"),
  data:         jsonb("data").notNull().default({}),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export type Deal = typeof dealsTable.$inferSelect;
