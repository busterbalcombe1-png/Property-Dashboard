import { Router, type IRouter } from "express";
import { db, calendarEventsTable, propertiesTable, tenantsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/calendar-events", async (_req, res) => {
  try {
    const rows = await db.select().from(calendarEventsTable).orderBy(calendarEventsTable.date);
    res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      date: r.date,
      type: r.type,
      description: r.description ?? undefined,
      propertyId: r.propertyId ?? undefined,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calendar/aggregate", async (_req, res) => {
  try {
    const [properties, tenants, customEvents] = await Promise.all([
      db.select().from(propertiesTable),
      db.select().from(tenantsTable),
      db.select().from(calendarEventsTable).orderBy(calendarEventsTable.date),
    ]);

    const events: object[] = [];

    for (const p of properties) {
      if (p.epcExpiryDate) events.push({ id: `epc-${p.id}`, title: "EPC Expiry", date: p.epcExpiryDate, type: "compliance", subtype: "EPC", propertyId: p.id, propertyAddress: p.address });
      if (p.eicrExpiryDate) events.push({ id: `eicr-${p.id}`, title: "EICR Expiry", date: p.eicrExpiryDate, type: "compliance", subtype: "EICR", propertyId: p.id, propertyAddress: p.address });
      if (p.gasSafetyExpiryDate) events.push({ id: `gas-${p.id}`, title: "Gas Safety Expiry", date: p.gasSafetyExpiryDate, type: "compliance", subtype: "Gas Safety", propertyId: p.id, propertyAddress: p.address });
    }

    for (const t of tenants) {
      const name = `${t.firstName} ${t.lastName}`;
      if (t.leaseStart) events.push({ id: `ls-${t.id}`, title: `${name} — Tenancy Start`, date: t.leaseStart, type: "lease_start", tenantId: t.id, tenantName: name, propertyId: t.propertyId });
      if (t.noticeGivenDate) {
        // Rolling tenancy: vacate date = notice given + 2 months
        const noticeDate = new Date(t.noticeGivenDate);
        const vacateDate = new Date(noticeDate);
        vacateDate.setMonth(vacateDate.getMonth() + 2);
        const vacateDateStr = vacateDate.toISOString().split("T")[0];
        events.push({ id: `le-${t.id}`, title: `${name} — Vacate Date`, date: vacateDateStr, type: "lease_end", tenantId: t.id, tenantName: name, propertyId: t.propertyId, noticeGivenDate: t.noticeGivenDate });
      }
    }

    for (const e of customEvents) {
      events.push({ id: `task-${e.id}`, dbId: e.id, title: e.title, date: e.date, type: e.type, description: e.description ?? undefined, propertyId: e.propertyId ?? undefined, priority: e.priority });
    }

    events.sort((a: any, b: any) => a.date.localeCompare(b.date));
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calendar-events", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(calendarEventsTable).values({
      title: body.title as string,
      date: body.date as string,
      type: (body.type as string) || "task",
      description: (body.description as string) || null,
      propertyId: body.propertyId ? Number(body.propertyId) : null,
      priority: (body.priority as string) || "normal",
    }).returning();
    res.status(201).json({ id: row.id, title: row.title, date: row.date, type: row.type, description: row.description ?? undefined, propertyId: row.propertyId ?? undefined, priority: row.priority });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/calendar-events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(calendarEventsTable).set({
      title: body.title as string,
      date: body.date as string,
      type: (body.type as string) || "task",
      description: (body.description as string) || null,
      propertyId: body.propertyId ? Number(body.propertyId) : null,
      priority: (body.priority as string) || "normal",
      updatedAt: new Date(),
    }).where(eq(calendarEventsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id: row.id, title: row.title, date: row.date, type: row.type, description: row.description ?? undefined, propertyId: row.propertyId ?? undefined, priority: row.priority });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/calendar-events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(calendarEventsTable).where(eq(calendarEventsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
