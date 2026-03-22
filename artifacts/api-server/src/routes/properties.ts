import { Router, type IRouter } from "express";
import { db, propertiesTable } from "@workspace/db";
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
    const [row] = await db.insert(propertiesTable).values(buildInsert(body)).returning();
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
    const [row] = await db.update(propertiesTable)
      .set({ ...buildInsert(body), updatedAt: new Date() })
      .where(eq(propertiesTable.id, id))
      .returning();
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

function buildInsert(body: Record<string, unknown>) {
  return {
    address: body.address as string,
    propertyType: body.propertyType as string,
    bedrooms: Number(body.bedrooms) || 1,
    bathrooms: body.bathrooms != null ? Number(body.bathrooms) : null,
    yearBuilt: body.yearBuilt != null ? Number(body.yearBuilt) : null,
    epcRating: (body.epcRating as string) || null,
    councilTaxBand: (body.councilTaxBand as string) || null,
    purchasePrice: String(body.purchasePrice),
    currentValue: String(body.currentValue),
    monthlyRent: String(body.monthlyRent),
    monthlyMortgage: String(body.monthlyMortgage),
    monthlyExpenses: String(body.monthlyExpenses),
    status: body.status as string,
    purchaseDate: body.purchaseDate as string,
    mortgageLender: (body.mortgageLender as string) || null,
    mortgageRate: body.mortgageRate != null ? String(body.mortgageRate) : null,
    mortgageType: (body.mortgageType as string) || null,
    mortgageTermYears: body.mortgageTermYears != null ? Number(body.mortgageTermYears) : null,
    mortgageFixEndDate: (body.mortgageFixEndDate as string) || null,
    mortgageBalance: body.mortgageBalance != null ? String(body.mortgageBalance) : null,
    photoUrl: (body.photoUrl as string) || null,
    rightmoveUrl: (body.rightmoveUrl as string) || null,
    zooplaUrl: (body.zooplaUrl as string) || null,
    landRegistryUrl: (body.landRegistryUrl as string) || null,
    lettingAgent: (body.lettingAgent as string) || null,
    lettingAgentPhone: (body.lettingAgentPhone as string) || null,
    lettingAgentEmail: (body.lettingAgentEmail as string) || null,
    lettingAgentFee: body.lettingAgentFee != null && body.lettingAgentFee !== "" ? String(body.lettingAgentFee) : null,
    solicitor: (body.solicitor as string) || null,
    solicitorPhone: (body.solicitorPhone as string) || null,
    insuranceProvider: (body.insuranceProvider as string) || null,
    insuranceRenewalDate: (body.insuranceRenewalDate as string) || null,
    notes: (body.notes as string) || null,
  };
}

function formatProperty(row: typeof propertiesTable.$inferSelect) {
  return {
    id: row.id,
    address: row.address,
    propertyType: row.propertyType,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms ?? undefined,
    yearBuilt: row.yearBuilt ?? undefined,
    epcRating: row.epcRating ?? undefined,
    councilTaxBand: row.councilTaxBand ?? undefined,
    purchasePrice: parseFloat(row.purchasePrice),
    currentValue: parseFloat(row.currentValue),
    monthlyRent: parseFloat(row.monthlyRent),
    monthlyMortgage: parseFloat(row.monthlyMortgage),
    monthlyExpenses: parseFloat(row.monthlyExpenses),
    status: row.status,
    purchaseDate: row.purchaseDate,
    mortgageLender: row.mortgageLender ?? undefined,
    mortgageRate: row.mortgageRate ? parseFloat(row.mortgageRate) : undefined,
    mortgageType: row.mortgageType ?? undefined,
    mortgageTermYears: row.mortgageTermYears ?? undefined,
    mortgageFixEndDate: row.mortgageFixEndDate ?? undefined,
    mortgageBalance: row.mortgageBalance ? parseFloat(row.mortgageBalance) : undefined,
    photoUrl: row.photoUrl ?? undefined,
    rightmoveUrl: row.rightmoveUrl ?? undefined,
    zooplaUrl: row.zooplaUrl ?? undefined,
    landRegistryUrl: row.landRegistryUrl ?? undefined,
    lettingAgent: row.lettingAgent ?? undefined,
    lettingAgentPhone: row.lettingAgentPhone ?? undefined,
    lettingAgentEmail: row.lettingAgentEmail ?? undefined,
    lettingAgentFee: row.lettingAgentFee ? parseFloat(row.lettingAgentFee) : undefined,
    solicitor: row.solicitor ?? undefined,
    solicitorPhone: row.solicitorPhone ?? undefined,
    insuranceProvider: row.insuranceProvider ?? undefined,
    insuranceRenewalDate: row.insuranceRenewalDate ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
