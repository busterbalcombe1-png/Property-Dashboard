import { Router, type IRouter } from "express";
import { db, cashflowMonthsTable, propertiesTable, tenantsTable, maintenanceTable, operatingCostsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/cashflow-months", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(cashflowMonthsTable)
      .orderBy(asc(cashflowMonthsTable.month));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cashflow-months/:month", async (req, res) => {
  try {
    const { month } = req.params;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month must be YYYY-MM format" });
    }
    const { income, expenses, notes } = req.body;
    const existing = await db
      .select()
      .from(cashflowMonthsTable)
      .where(eq(cashflowMonthsTable.month, month));
    if (existing.length > 0) {
      const [updated] = await db
        .update(cashflowMonthsTable)
        .set({
          income: String(income ?? existing[0].income),
          expenses: String(expenses ?? existing[0].expenses),
          notes: notes !== undefined ? notes : existing[0].notes,
          updatedAt: new Date(),
        })
        .where(eq(cashflowMonthsTable.month, month))
        .returning();
      return res.json(updated);
    } else {
      const [inserted] = await db
        .insert(cashflowMonthsTable)
        .values({
          month,
          income: String(income ?? 0),
          expenses: String(expenses ?? 0),
          notes: notes ?? null,
        })
        .returning();
      return res.json(inserted);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cashflow-months/snapshot", async (_req, res) => {
  try {
    const [properties, tenants, maintenance, operatingCosts] = await Promise.all([
      db.select().from(propertiesTable),
      db.select().from(tenantsTable),
      db.select().from(maintenanceTable),
      db.select().from(operatingCostsTable),
    ]);

    const rentByPropId: Record<number, number> = {};
    for (const t of tenants) {
      rentByPropId[t.propertyId] = (rentByPropId[t.propertyId] ?? 0) + parseFloat(t.monthlyRent);
    }
    const monthlyRentIncome = Object.values(rentByPropId).reduce((a, b) => a + b, 0);

    const monthlyMortgageCosts = properties.reduce((sum, p) => sum + parseFloat(p.monthlyMortgage), 0);
    const monthlyOperatingCosts = operatingCosts
      .filter(oc => oc.paidBy === "me" && oc.active)
      .reduce((sum, oc) => {
        const amt = parseFloat(oc.amount as string);
        if (oc.billingPeriod === "quarterly") return sum + amt / 3;
        if (oc.billingPeriod === "annual") return sum + amt / 12;
        return sum + amt;
      }, 0);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const maintenanceThisMonth = maintenance
      .filter(m => {
        const dateStr = m.completedDate ?? m.reportedDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === currentMonthKey;
      })
      .reduce((sum, m) => sum + (parseFloat((m.actualCost ?? m.estimatedCost) as string) || 0), 0);

    const income = Math.round(monthlyRentIncome);
    const expenses = Math.round(monthlyMortgageCosts + monthlyOperatingCosts + maintenanceThisMonth);

    const existing = await db
      .select()
      .from(cashflowMonthsTable)
      .where(eq(cashflowMonthsTable.month, currentMonthKey));

    let record;
    if (existing.length > 0) {
      [record] = await db
        .update(cashflowMonthsTable)
        .set({ income: String(income), expenses: String(expenses), updatedAt: new Date() })
        .where(eq(cashflowMonthsTable.month, currentMonthKey))
        .returning();
    } else {
      [record] = await db
        .insert(cashflowMonthsTable)
        .values({ month: currentMonthKey, income: String(income), expenses: String(expenses) })
        .returning();
    }

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
