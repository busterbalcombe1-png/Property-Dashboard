import pg from "pg";

const { Client } = pg;
const raw = process.env.DATABASE_URL;
if (!raw) throw new Error("DATABASE_URL not set");

// Parse a postgres URL that may have @ in the password
// Format: postgresql://user:password@host:port/db
function parsePgUrl(url) {
  const withoutScheme = url.replace(/^postgresql:\/\/|^postgres:\/\//, "");
  // Split on the LAST @ to handle @ in passwords
  const lastAt = withoutScheme.lastIndexOf("@");
  const userInfo = withoutScheme.slice(0, lastAt);
  const hostInfo = withoutScheme.slice(lastAt + 1);

  const colonInUser = userInfo.indexOf(":");
  const user = userInfo.slice(0, colonInUser);
  const password = userInfo.slice(colonInUser + 1);

  const slashInHost = hostInfo.indexOf("/");
  const hostPort = hostInfo.slice(0, slashInHost);
  const database = hostInfo.slice(slashInHost + 1).split("?")[0];

  const colonInHost = hostPort.lastIndexOf(":");
  const host = hostPort.slice(0, colonInHost);
  const port = parseInt(hostPort.slice(colonInHost + 1)) || 5432;

  return { user, password: decodeURIComponent(password), host, port, database };
}

const { user, password, host, port, database } = parsePgUrl(raw);
const projectRef = user.split(".")[1];

console.log("Parsed connection:");
console.log("  user:", user);
console.log("  password length:", password.length);
console.log("  host:", host);
console.log("  port:", port);
console.log("  database:", database);
console.log("  projectRef:", projectRef);

async function tryConnect(label, config) {
  const client = new Client({ ...config, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const r = await client.query("SELECT NOW()");
    console.log(`SUCCESS [${label}]:`, r.rows[0].now);
    await client.end();
    return true;
  } catch (e) {
    console.log(`FAIL [${label}]:`, e.message);
    return false;
  }
}

// Test 1: pooler port 5432 (session mode)
await tryConnect("pooler:5432", { host, port: 5432, user, password, database, ssl: { rejectUnauthorized: false } });

// Test 2: pooler port 6543 (transaction mode)
await tryConnect("pooler:6543", { host, port: 6543, user, password, database, ssl: { rejectUnauthorized: false } });

// Test 3: direct connection
if (projectRef) {
  await tryConnect("direct:5432", {
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    user: "postgres",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
}
