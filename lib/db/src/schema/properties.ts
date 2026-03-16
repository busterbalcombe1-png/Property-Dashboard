import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  propertyType: text("property_type").notNull(),
  bedrooms: integer("bedrooms").notNull().default(1),
  bathrooms: integer("bathrooms").default(1),
  yearBuilt: integer("year_built"),
  epcRating: text("epc_rating"),
  councilTaxBand: text("council_tax_band"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 12, scale: 2 }).notNull(),
  monthlyRent: numeric("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  monthlyMortgage: numeric("monthly_mortgage", { precision: 10, scale: 2 }).notNull(),
  monthlyExpenses: numeric("monthly_expenses", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("vacant"),
  purchaseDate: text("purchase_date").notNull(),
  // Mortgage details
  mortgageLender: text("mortgage_lender"),
  mortgageRate: numeric("mortgage_rate", { precision: 5, scale: 2 }),
  mortgageType: text("mortgage_type"),
  mortgageTermYears: integer("mortgage_term_years"),
  mortgageFixEndDate: text("mortgage_fix_end_date"),
  mortgageBalance: numeric("mortgage_balance", { precision: 12, scale: 2 }),
  // Links
  photoUrl: text("photo_url"),
  rightmoveUrl: text("rightmove_url"),
  zooplaUrl: text("zoopla_url"),
  landRegistryUrl: text("land_registry_url"),
  // Contacts
  lettingAgent: text("letting_agent"),
  lettingAgentPhone: text("letting_agent_phone"),
  lettingAgentEmail: text("letting_agent_email"),
  solicitor: text("solicitor"),
  solicitorPhone: text("solicitor_phone"),
  insuranceProvider: text("insurance_provider"),
  insuranceRenewalDate: text("insurance_renewal_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
