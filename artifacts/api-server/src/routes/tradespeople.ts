import { Router, type IRouter } from "express";
import { db, tradespeopleTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/properties/:propertyId/tradespeople", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId);
    const rows = await db
      .select()
      .from(tradespeopleTable)
      .where(eq(tradespeopleTable.propertyId, propertyId))
      .orderBy(tradespeopleTable.tradeType);
    res.json(rows.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/properties/:propertyId/tradespeople", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId);
    const body = req.body;
    const [row] = await db.insert(tradespeopleTable).values({
      propertyId,
      tradeType: body.tradeType,
      name:      body.name,
      company:   body.company ?? null,
      phone:     body.phone   ?? null,
      email:     body.email   ?? null,
      notes:     body.notes   ?? null,
    }).returning();
    res.status(201).json(fmt(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/properties/:propertyId/tradespeople/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tradespeopleTable).where(eq(tradespeopleTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function fmt(row: typeof tradespeopleTable.$inferSelect) {
  return {
    id:         row.id,
    propertyId: row.propertyId,
    tradeType:  row.tradeType,
    name:       row.name,
    company:    row.company   ?? undefined,
    phone:      row.phone     ?? undefined,
    email:      row.email     ?? undefined,
    notes:      row.notes     ?? undefined,
    createdAt:  row.createdAt.toISOString(),
  };
}

export default router;
