import { Router, type IRouter } from "express";
import { db, propertiesTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/properties", async (_req, res) => {
  try {
    const rows = await db.select().from(propertiesTable).orderBy(propertiesTable.id);
    res.json(rows.map(formatProperty));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!row) return res.status(404).json({ error: "Property not found" });
    res.json(formatProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/properties", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(propertiesTable).values({
      address: body.address,
      propertyType: body.propertyType,
      bedrooms: body.bedrooms,
      purchasePrice: String(body.purchasePrice),
      currentValue: String(body.currentValue),
      monthlyRent: String(body.monthlyRent),
      monthlyMortgage: String(body.monthlyMortgage),
      monthlyExpenses: String(body.monthlyExpenses),
      status: body.status,
      purchaseDate: body.purchaseDate,
      notes: body.notes ?? null,
    }).returning();
    res.status(201).json(formatProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(propertiesTable).set({
      address: body.address,
      propertyType: body.propertyType,
      bedrooms: body.bedrooms,
      purchasePrice: String(body.purchasePrice),
      currentValue: String(body.currentValue),
      monthlyRent: String(body.monthlyRent),
      monthlyMortgage: String(body.monthlyMortgage),
      monthlyExpenses: String(body.monthlyExpenses),
      status: body.status,
      purchaseDate: body.purchaseDate,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(propertiesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Property not found" });
    res.json(formatProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatProperty(row: typeof propertiesTable.$inferSelect) {
  return {
    id: row.id,
    address: row.address,
    propertyType: row.propertyType,
    bedrooms: row.bedrooms,
    purchasePrice: parseFloat(row.purchasePrice),
    currentValue: parseFloat(row.currentValue),
    monthlyRent: parseFloat(row.monthlyRent),
    monthlyMortgage: parseFloat(row.monthlyMortgage),
    monthlyExpenses: parseFloat(row.monthlyExpenses),
    status: row.status,
    purchaseDate: row.purchaseDate,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
