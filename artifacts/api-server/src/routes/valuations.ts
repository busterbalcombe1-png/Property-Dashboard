import { Router, type IRouter } from "express";
import { db, valuationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/properties/:id/valuations", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    const rows = await db
      .select()
      .from(valuationsTable)
      .where(eq(valuationsTable.propertyId, propertyId))
      .orderBy(asc(valuationsTable.valuationDate));
    res.json(rows.map(formatValuation));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/properties/:id/valuations", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.insert(valuationsTable).values({
      propertyId,
      valuationDate: body.valuationDate,
      value: String(body.value),
      source: body.source,
      notes: body.notes ?? null,
    }).returning();
    res.status(201).json(formatValuation(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/properties/:id/valuations/:valuationId", async (req, res) => {
  try {
    const valuationId = parseInt(req.params.valuationId);
    await db.delete(valuationsTable).where(eq(valuationsTable.id, valuationId));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatValuation(row: typeof valuationsTable.$inferSelect) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    valuationDate: row.valuationDate,
    value: parseFloat(row.value),
    source: row.source,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
