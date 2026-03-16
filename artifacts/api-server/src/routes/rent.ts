import { Router, type IRouter } from "express";
import { db, rentPaymentsTable, rentChargesTable, depositsTable, propertiesTable, tenantsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

const toNum = (v: unknown) => v != null && v !== "" ? parseFloat(String(v)) : null;
const toStr = (v: unknown) => v != null && v !== "" ? String(v) : null;

// ─── RENT PAYMENTS ───────────────────────────────────────────────────────────

router.get("/rent/payments", async (req, res) => {
  try {
    const { propertyId } = req.query;
    let rows;
    if (propertyId) {
      rows = await db.select().from(rentPaymentsTable)
        .where(eq(rentPaymentsTable.propertyId, parseInt(String(propertyId))))
        .orderBy(desc(rentPaymentsTable.dueDate));
    } else {
      rows = await db.select().from(rentPaymentsTable).orderBy(desc(rentPaymentsTable.dueDate));
    }
    res.json(rows.map(formatPayment));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/rent/payments", async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db.insert(rentPaymentsTable).values({
      propertyId: parseInt(b.propertyId),
      tenantId: b.tenantId ? parseInt(b.tenantId) : null,
      dueDate: b.dueDate,
      paidDate: toStr(b.paidDate),
      amountDue: String(b.amountDue),
      amountPaid: b.amountPaid != null ? String(b.amountPaid) : null,
      status: b.status ?? "pending",
      paymentMethod: toStr(b.paymentMethod),
      reference: toStr(b.reference),
      notes: toStr(b.notes),
    }).returning();
    res.status(201).json(formatPayment(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/rent/payments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body;
    const [row] = await db.update(rentPaymentsTable).set({
      paidDate: toStr(b.paidDate),
      amountPaid: b.amountPaid != null ? String(b.amountPaid) : null,
      status: b.status,
      paymentMethod: toStr(b.paymentMethod),
      reference: toStr(b.reference),
      notes: toStr(b.notes),
      updatedAt: new Date(),
    }).where(eq(rentPaymentsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatPayment(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/rent/payments/:id", async (req, res) => {
  try {
    await db.delete(rentPaymentsTable).where(eq(rentPaymentsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── RENT CHARGES ────────────────────────────────────────────────────────────

router.get("/rent/charges", async (req, res) => {
  try {
    const { propertyId } = req.query;
    let rows;
    if (propertyId) {
      rows = await db.select().from(rentChargesTable)
        .where(eq(rentChargesTable.propertyId, parseInt(String(propertyId))))
        .orderBy(desc(rentChargesTable.chargeDate));
    } else {
      rows = await db.select().from(rentChargesTable).orderBy(desc(rentChargesTable.chargeDate));
    }
    res.json(rows.map(formatCharge));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/rent/charges", async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db.insert(rentChargesTable).values({
      propertyId: parseInt(b.propertyId),
      tenantId: b.tenantId ? parseInt(b.tenantId) : null,
      chargeDate: b.chargeDate,
      chargeType: b.chargeType,
      description: b.description,
      amount: String(b.amount),
      isPaid: b.isPaid ?? false,
      paidDate: toStr(b.paidDate),
      deductedFromDeposit: b.deductedFromDeposit ?? false,
      notes: toStr(b.notes),
    }).returning();
    res.status(201).json(formatCharge(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/rent/charges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body;
    const [row] = await db.update(rentChargesTable).set({
      chargeType: b.chargeType,
      description: b.description,
      amount: String(b.amount),
      isPaid: b.isPaid,
      paidDate: toStr(b.paidDate),
      deductedFromDeposit: b.deductedFromDeposit,
      notes: toStr(b.notes),
    }).where(eq(rentChargesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatCharge(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/rent/charges/:id", async (req, res) => {
  try {
    await db.delete(rentChargesTable).where(eq(rentChargesTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── DEPOSITS ────────────────────────────────────────────────────────────────

router.get("/rent/deposits", async (req, res) => {
  try {
    const { propertyId } = req.query;
    let rows;
    if (propertyId) {
      rows = await db.select({
        deposit: depositsTable,
        tenantFirstName: tenantsTable.firstName,
        tenantLastName: tenantsTable.lastName,
        propertyAddress: propertiesTable.address,
      }).from(depositsTable)
        .leftJoin(tenantsTable, eq(depositsTable.tenantId, tenantsTable.id))
        .leftJoin(propertiesTable, eq(depositsTable.propertyId, propertiesTable.id))
        .where(eq(depositsTable.propertyId, parseInt(String(propertyId))))
        .orderBy(desc(depositsTable.receivedDate));
    } else {
      rows = await db.select({
        deposit: depositsTable,
        tenantFirstName: tenantsTable.firstName,
        tenantLastName: tenantsTable.lastName,
        propertyAddress: propertiesTable.address,
      }).from(depositsTable)
        .leftJoin(tenantsTable, eq(depositsTable.tenantId, tenantsTable.id))
        .leftJoin(propertiesTable, eq(depositsTable.propertyId, propertiesTable.id))
        .orderBy(desc(depositsTable.receivedDate));
    }
    res.json(rows.map(r => ({
      ...formatDeposit(r.deposit),
      tenantName: r.tenantFirstName ? `${r.tenantFirstName} ${r.tenantLastName}` : null,
      propertyAddress: r.propertyAddress ?? null,
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/rent/deposits", async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db.insert(depositsTable).values({
      propertyId: parseInt(b.propertyId),
      tenantId: b.tenantId ? parseInt(b.tenantId) : null,
      amount: String(b.amount),
      receivedDate: b.receivedDate,
      scheme: b.scheme ?? "DPS",
      schemeReference: toStr(b.schemeReference),
      registeredDate: toStr(b.registeredDate),
      status: b.status ?? "held",
      returnedAmount: b.returnedAmount != null ? String(b.returnedAmount) : null,
      returnedDate: toStr(b.returnedDate),
      deductions: b.deductions != null ? String(b.deductions) : null,
      deductionNotes: toStr(b.deductionNotes),
      prescribedInfoSent: b.prescribedInfoSent ?? false,
      prescribedInfoDate: toStr(b.prescribedInfoDate),
      notes: toStr(b.notes),
    }).returning();
    const [t] = row.tenantId ? await db.select().from(tenantsTable).where(eq(tenantsTable.id, row.tenantId)) : [null];
    const [p] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.status(201).json({ ...formatDeposit(row), tenantName: t ? `${t.firstName} ${t.lastName}` : null, propertyAddress: p?.address ?? null });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/rent/deposits/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body;
    const [row] = await db.update(depositsTable).set({
      scheme: b.scheme,
      schemeReference: toStr(b.schemeReference),
      registeredDate: toStr(b.registeredDate),
      status: b.status,
      returnedAmount: b.returnedAmount != null ? String(b.returnedAmount) : null,
      returnedDate: toStr(b.returnedDate),
      deductions: b.deductions != null ? String(b.deductions) : null,
      deductionNotes: toStr(b.deductionNotes),
      prescribedInfoSent: b.prescribedInfoSent,
      prescribedInfoDate: toStr(b.prescribedInfoDate),
      notes: toStr(b.notes),
      updatedAt: new Date(),
    }).where(eq(depositsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatDeposit(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/rent/deposits/:id", async (req, res) => {
  try {
    await db.delete(depositsTable).where(eq(depositsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── FORMATTERS ──────────────────────────────────────────────────────────────

function formatPayment(r: typeof rentPaymentsTable.$inferSelect) {
  return {
    ...r,
    amountDue: parseFloat(r.amountDue),
    amountPaid: r.amountPaid != null ? parseFloat(r.amountPaid) : null,
  };
}

function formatCharge(r: typeof rentChargesTable.$inferSelect) {
  return { ...r, amount: parseFloat(r.amount) };
}

function formatDeposit(r: typeof depositsTable.$inferSelect) {
  return {
    ...r,
    amount: parseFloat(r.amount),
    returnedAmount: r.returnedAmount != null ? parseFloat(r.returnedAmount) : null,
    deductions: r.deductions != null ? parseFloat(r.deductions) : null,
  };
}

export default router;
