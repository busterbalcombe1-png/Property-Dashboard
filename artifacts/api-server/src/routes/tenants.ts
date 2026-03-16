import { Router, type IRouter } from "express";
import { db, tenantsTable, propertiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tenants", async (_req, res) => {
  try {
    const rows = await db
      .select({
        tenant: tenantsTable,
        propertyAddress: propertiesTable.address,
      })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .orderBy(tenantsTable.id);
    res.json(rows.map(r => formatTenant(r.tenant, r.propertyAddress ?? undefined)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({ tenant: tenantsTable, propertyAddress: propertiesTable.address })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(eq(tenantsTable.id, id));
    if (!row) return res.status(404).json({ error: "Tenant not found" });
    res.json(formatTenant(row.tenant, row.propertyAddress ?? undefined));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tenants", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(tenantsTable).values({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      propertyId: body.propertyId,
      leaseStart: body.leaseStart,
      leaseEnd: body.leaseEnd,
      monthlyRent: String(body.monthlyRent),
      depositPaid: String(body.depositPaid),
      status: body.status,
      notes: body.notes ?? null,
    }).returning();
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.status(201).json(formatTenant(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(tenantsTable).set({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      propertyId: body.propertyId,
      leaseStart: body.leaseStart,
      leaseEnd: body.leaseEnd,
      monthlyRent: String(body.monthlyRent),
      depositPaid: String(body.depositPaid),
      status: body.status,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(tenantsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Tenant not found" });
    const [prop] = await db.select({ address: propertiesTable.address }).from(propertiesTable).where(eq(propertiesTable.id, row.propertyId));
    res.json(formatTenant(row, prop?.address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatTenant(row: typeof tenantsTable.$inferSelect, propertyAddress?: string) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    propertyId: row.propertyId,
    propertyAddress: propertyAddress ?? "",
    leaseStart: row.leaseStart,
    leaseEnd: row.leaseEnd,
    monthlyRent: parseFloat(row.monthlyRent),
    depositPaid: parseFloat(row.depositPaid),
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
