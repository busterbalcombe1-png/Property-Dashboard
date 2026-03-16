import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rentPaymentsTable = pgTable("rent_payments", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id"),
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  amountDue: numeric("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"), // pending | paid | partial | overdue
  paymentMethod: text("payment_method"), // bank_transfer | standing_order | cheque | cash | other
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rentChargesTable = pgTable("rent_charges", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id"),
  chargeDate: text("charge_date").notNull(),
  chargeType: text("charge_type").notNull(), // late_fee | damage | cleaning | admin | legal | other
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  paidDate: text("paid_date"),
  deductedFromDeposit: boolean("deducted_from_deposit").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const depositsTable = pgTable("deposits", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  receivedDate: text("received_date").notNull(),
  scheme: text("scheme").notNull().default("DPS"), // DPS | myDeposits | TDS | Landlord (held by landlord)
  schemeReference: text("scheme_reference"),
  registeredDate: text("registered_date"),
  status: text("status").notNull().default("held"), // held | returned | partial_return | disputed | pending
  returnedAmount: numeric("returned_amount", { precision: 10, scale: 2 }),
  returnedDate: text("returned_date"),
  deductions: numeric("deductions", { precision: 10, scale: 2 }),
  deductionNotes: text("deduction_notes"),
  prescribedInfoSent: boolean("prescribed_info_sent").notNull().default(false),
  prescribedInfoDate: text("prescribed_info_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRentPaymentSchema = createInsertSchema(rentPaymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRentChargeSchema = createInsertSchema(rentChargesTable).omit({ id: true, createdAt: true });
export const insertDepositSchema = createInsertSchema(depositsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type RentPayment = typeof rentPaymentsTable.$inferSelect;
export type RentCharge = typeof rentChargesTable.$inferSelect;
export type Deposit = typeof depositsTable.$inferSelect;
export type InsertRentPayment = z.infer<typeof insertRentPaymentSchema>;
export type InsertRentCharge = z.infer<typeof insertRentChargeSchema>;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
