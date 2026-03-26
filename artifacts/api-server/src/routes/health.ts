import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const rawUrl = process.env.DATABASE_URL ?? "(not set)";
  // Show the host portion only — never expose password
  let dbHost = "(unknown)";
  try {
    const lastAt = rawUrl.lastIndexOf("@");
    if (lastAt !== -1) {
      dbHost = rawUrl.slice(lastAt + 1).split("/")[0];
    }
  } catch {}

  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", database: "connected", dbHost });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", database: "disconnected", dbHost, error: message });
  }
});

export default router;
