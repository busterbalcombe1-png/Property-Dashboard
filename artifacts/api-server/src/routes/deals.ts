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

// ─── Rightmove image proxy ────────────────────────────────────────────────────
router.get("/rightmove-images", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  if (!url || !url.includes("rightmove.co.uk")) {
    return res.status(400).json({ error: "Invalid URL", images: [], floorplans: [] });
  }
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!resp.ok) {
      return res.json({ images: [], floorplans: [], error: `HTTP ${resp.status}` });
    }

    const html = await resp.text();

    // Extract the PAGE_MODEL JSON using bracket-counting (handles deeply nested objects)
    const startStr = "window.PAGE_MODEL = ";
    const startIdx = html.indexOf(startStr);
    if (startIdx === -1) return res.json({ images: [], floorplans: [] });

    let jsonStart = html.indexOf("{", startIdx + startStr.length);
    if (jsonStart === -1) return res.json({ images: [], floorplans: [] });

    let depth = 0, inStr = false, esc = false, jsonEnd = -1;
    for (let i = jsonStart; i < html.length; i++) {
      const c = html[i];
      if (esc) { esc = false; continue; }
      if (c === "\\" && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { jsonEnd = i; break; } }
    }

    if (jsonEnd === -1) return res.json({ images: [], floorplans: [] });

    const pageModel = JSON.parse(html.slice(jsonStart, jsonEnd + 1));
    const pd = pageModel.propertyData ?? pageModel;

    const images = ((pd.images ?? []) as any[]).map((img: any) => ({
      url: img.url ?? img.srcUrl ?? img.src ?? "",
      caption: img.caption ?? img.altText ?? "",
    })).filter((i: any) => i.url);

    const floorplans = ((pd.floorplans ?? pd.floorplanImages ?? []) as any[]).map((fp: any) => ({
      url: fp.url ?? fp.srcUrl ?? fp.src ?? "",
      caption: fp.caption ?? fp.altText ?? "",
    })).filter((f: any) => f.url);

    res.json({ images, floorplans });
  } catch (err) {
    console.error("Rightmove proxy error:", err);
    res.json({ images: [], floorplans: [] });
  }
});

export default router;
