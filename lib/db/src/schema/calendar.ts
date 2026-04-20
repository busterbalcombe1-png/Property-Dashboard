import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { propertiesTable } from "./properties.js";

export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("task"),
  description: text("description"),
  propertyId: integer("property_id").references(() => propertiesTable.id),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
