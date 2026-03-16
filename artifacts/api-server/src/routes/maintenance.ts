import { Router, type IRouter } from "express";
import { db, maintenanceTable, propertiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/maintenance", async (_req, res) => {
  try {
    const rows = await db
      .select({ m: maintenanceTable, propertyAddress: propertiesTable.address })
      .from(maintenanceTable)
      .leftJoin(propertiesTable, eq(maintenanceTable.propertyId, propertiesTable.id))
      .orderBy(maintenanceTable.id);
    res.json(rows.map(r => formatMaintenance(r.m, r.propertyAddress ?? undefined)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(maintenanceTable).values({
      propertyId: body.propertyId,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      status: body.status,
      estimatedCost: String(body.estimatedCost),
      actualCost: body.actualCost != null ? String(body.actualCost) : null,
      reportedDate: body.reportedDate,
      completedDate: body.completedDate ?? null,
      notes: body.notes ?? null,
    }).returning();
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.status(201).json(formatMaintenance(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/maintenance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(maintenanceTable).set({
      propertyId: body.propertyId,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      status: body.status,
      estimatedCost: String(body.estimatedCost),
      actualCost: body.actualCost != null ? String(body.actualCost) : null,
      reportedDate: body.reportedDate,
      completedDate: body.completedDate ?? null,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(maintenanceTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Maintenance request not found" });
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.json(formatMaintenance(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/maintenance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(maintenanceTable).where(eq(maintenanceTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatMaintenance(row: typeof maintenanceTable.$inferSelect, propertyAddress?: string) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    propertyAddress: propertyAddress ?? "",
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    estimatedCost: parseFloat(row.estimatedCost),
    actualCost: row.actualCost != null ? parseFloat(row.actualCost) : undefined,
    reportedDate: row.reportedDate,
    completedDate: row.completedDate ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
