import { Router, type IRouter } from "express";
import { db, operatingCostsTable, maintenanceTable, propertiesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router: IRouter = Router();

function toMonthly(amount: number, period: string): number {
  if (period === "quarterly") return amount / 3;
  if (period === "annual") return amount / 12;
  return amount;
}

function formatCost(row: typeof operatingCostsTable.$inferSelect, propertyAddress?: string) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    propertyAddress: propertyAddress ?? "",
    category: row.category,
    description: row.description ?? undefined,
    amount: parseFloat(row.amount),
    billingPeriod: row.billingPeriod,
    paidBy: row.paidBy,
    notes: row.notes ?? undefined,
    active: row.active,
    monthlyEquivalent: toMonthly(parseFloat(row.amount), row.billingPeriod),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/operating-costs", async (req, res) => {
  try {
    const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
    const rows = await db
      .select({ oc: operatingCostsTable, propertyAddress: propertiesTable.address })
      .from(operatingCostsTable)
      .leftJoin(propertiesTable, eq(operatingCostsTable.propertyId, propertiesTable.id))
      .where(propertyId ? eq(operatingCostsTable.propertyId, propertyId) : undefined)
      .orderBy(operatingCostsTable.propertyId, operatingCostsTable.category);
    res.json(rows.map(r => formatCost(r.oc, r.propertyAddress ?? undefined)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/operating-costs", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(operatingCostsTable).values({
      propertyId: Number(body.propertyId),
      category: body.category,
      description: body.description ?? null,
      amount: String(body.amount),
      billingPeriod: body.billingPeriod ?? "monthly",
      paidBy: body.paidBy ?? "me",
      notes: body.notes ?? null,
      active: body.active !== false,
    }).returning();
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.status(201).json(formatCost(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/operating-costs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(operatingCostsTable).set({
      propertyId: Number(body.propertyId),
      category: body.category,
      description: body.description ?? null,
      amount: String(body.amount),
      billingPeriod: body.billingPeriod ?? "monthly",
      paidBy: body.paidBy ?? "me",
      notes: body.notes ?? null,
      active: body.active !== false,
      updatedAt: new Date(),
    }).where(eq(operatingCostsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.json(formatCost(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/operating-costs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(operatingCostsTable).where(eq(operatingCostsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/properties/:id/expenses-breakdown", async (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const opRows = await db
      .select()
      .from(operatingCostsTable)
      .where(and(eq(operatingCostsTable.propertyId, propId), eq(operatingCostsTable.active, true)));

    const landlordOpCosts = opRows
      .filter(r => r.paidBy === "me")
      .map(r => ({
        id: r.id,
        category: r.category,
        description: r.description ?? undefined,
        amount: parseFloat(r.amount),
        billingPeriod: r.billingPeriod,
        paidBy: r.paidBy,
        monthlyEquivalent: toMonthly(parseFloat(r.amount), r.billingPeriod),
      }));

    const maintenanceRows = await db
      .select()
      .from(maintenanceTable)
      .where(
        and(
          eq(maintenanceTable.propertyId, propId),
          gte(maintenanceTable.reportedDate, firstOfMonth),
          lte(maintenanceTable.reportedDate, lastOfMonth),
        )
      );

    const maintenanceCosts = maintenanceRows
      .filter(r => r.actualCost != null)
      .map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        actualCost: r.actualCost != null ? parseFloat(r.actualCost) : 0,
        status: r.status,
        reportedDate: r.reportedDate,
      }));

    const totalOperatingMonthly = landlordOpCosts.reduce((s, r) => s + r.monthlyEquivalent, 0);
    const totalMaintenanceThisMonth = maintenanceCosts.reduce((s, r) => s + r.actualCost, 0);

    res.json({
      operatingCosts: landlordOpCosts,
      maintenanceCosts,
      totalOperatingMonthly,
      totalMaintenanceThisMonth,
      totalExpenses: totalOperatingMonthly + totalMaintenanceThisMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
