import { Router, type IRouter } from "express";
import { db, refurbTable, propertiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/refurb", async (_req, res) => {
  try {
    const rows = await db
      .select({ r: refurbTable, propertyAddress: propertiesTable.address })
      .from(refurbTable)
      .leftJoin(propertiesTable, eq(refurbTable.propertyId, propertiesTable.id))
      .orderBy(refurbTable.id);
    res.json(rows.map(r => formatRefurb(r.r, r.propertyAddress ?? undefined)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refurb", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(refurbTable).values({
      propertyId: body.propertyId,
      title: body.title,
      description: body.description,
      status: body.status,
      budget: String(body.budget),
      actualCost: body.actualCost != null ? String(body.actualCost) : null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      contractor: body.contractor ?? null,
      notes: body.notes ?? null,
    }).returning();
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.status(201).json(formatRefurb(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/refurb/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(refurbTable).set({
      propertyId: body.propertyId,
      title: body.title,
      description: body.description,
      status: body.status,
      budget: String(body.budget),
      actualCost: body.actualCost != null ? String(body.actualCost) : null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      contractor: body.contractor ?? null,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(refurbTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Refurb project not found" });
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.json(formatRefurb(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/refurb/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(refurbTable).where(eq(refurbTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatRefurb(row: typeof refurbTable.$inferSelect, propertyAddress?: string) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    propertyAddress: propertyAddress ?? "",
    title: row.title,
    description: row.description,
    status: row.status,
    budget: parseFloat(row.budget),
    actualCost: row.actualCost != null ? parseFloat(row.actualCost) : undefined,
    startDate: row.startDate,
    endDate: row.endDate ?? undefined,
    contractor: row.contractor ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
