import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse postgres URL robustly — handles @ signs inside passwords
function parsePgUrl(url: string) {
  const withoutScheme = url.replace(/^postgresql:\/\/|^postgres:\/\//, "");
  const lastAt = withoutScheme.lastIndexOf("@");
  const userInfo = withoutScheme.slice(0, lastAt);
  const hostInfo = withoutScheme.slice(lastAt + 1);
  const colonInUser = userInfo.indexOf(":");
  const user = userInfo.slice(0, colonInUser);
  const password = decodeURIComponent(userInfo.slice(colonInUser + 1));
  const slashInHost = hostInfo.indexOf("/");
  const hostPort = hostInfo.slice(0, slashInHost);
  const database = hostInfo.slice(slashInHost + 1).split("?")[0];
  const colonInHost = hostPort.lastIndexOf(":");
  const host = hostPort.slice(0, colonInHost);
  const port = parseInt(hostPort.slice(colonInHost + 1)) || 5432;
  return { user, password, host, port, database };
}

const { user, password, host, port, database } = parsePgUrl(rawUrl);

export const pool = new Pool({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export * from "./schema";
