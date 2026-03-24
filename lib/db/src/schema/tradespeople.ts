import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const tradespeopleTable = pgTable("tradespeople", {
  id:          serial("id").primaryKey(),
  propertyId:  integer("property_id").notNull(),
  tradeType:   text("trade_type").notNull(),
  name:        text("name").notNull(),
  company:     text("company"),
  phone:       text("phone"),
  email:       text("email"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export type Tradesperson = typeof tradespeopleTable.$inferSelect;
