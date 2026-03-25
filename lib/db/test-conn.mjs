import pg from "pg";

const { Client } = pg;
const url = new URL(process.env.DATABASE_URL);
const password = decodeURIComponent(url.password);
const projectRef = url.username.split(".")[1];

console.log("Testing connections...");
console.log("Project ref:", projectRef);
console.log("Password length:", password.length);

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
await tryConnect("pooler:5432", {
  host: url.hostname,
  port: 5432,
  user: url.username,
  password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Test 2: pooler port 6543 (transaction mode)
await tryConnect("pooler:6543", {
  host: url.hostname,
  port: 6543,
  user: url.username,
  password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

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
