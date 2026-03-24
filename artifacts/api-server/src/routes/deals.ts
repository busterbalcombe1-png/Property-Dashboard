import { Router, type IRouter } from "express";
import { db, dealsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function fmt(row: typeof dealsTable.$inferSelect) {
  return {
    id:           row.id,
    rightmoveUrl: row.rightmoveUrl ?? undefined,
    address:      row.address,
    askingPrice:  row.askingPrice != null ? parseFloat(row.askingPrice) : undefined,
    propertyType: row.propertyType ?? undefined,
    bedrooms:     row.bedrooms ?? undefined,
    status:       row.status,
    data:         row.data ?? {},
    createdAt:    row.createdAt.toISOString(),
    updatedAt:    row.updatedAt.toISOString(),
  };
}

router.get("/deals", async (_req, res) => {
  try {
    const rows = await db.select().from(dealsTable).orderBy(desc(dealsTable.createdAt));
    res.json(rows.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(dealsTable).where(eq(dealsTable.id, id));
    if (!row) return res.status(404).json({ error: "Deal not found" });
    res.json(fmt(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/deals", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(dealsTable).values({
      rightmoveUrl: body.rightmoveUrl || null,
      address:      body.address || "",
      askingPrice:  body.askingPrice != null ? String(body.askingPrice) : null,
      propertyType: body.propertyType || null,
      bedrooms:     body.bedrooms || null,
      status:       body.status || "criteria_check",
      data:         body.data ?? {},
    }).returning();
    res.status(201).json(fmt(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(dealsTable).set({
      rightmoveUrl: body.rightmoveUrl ?? null,
      address:      body.address,
      askingPrice:  body.askingPrice != null ? String(body.askingPrice) : null,
      propertyType: body.propertyType ?? null,
      bedrooms:     body.bedrooms ?? null,
      status:       body.status,
      data:         body.data ?? {},
      updatedAt:    new Date(),
    }).where(eq(dealsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Deal not found" });
    res.json(fmt(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(dealsTable).where(eq(dealsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
