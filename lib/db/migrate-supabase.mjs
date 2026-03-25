import pg from "pg";

const { Client } = pg;

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL not set");

const url = new URL(rawUrl);
const password = decodeURIComponent(url.password);

console.log("Connecting with:");
console.log("  host:", url.hostname);
console.log("  user:", url.username);
console.log("  password length:", password.length);
console.log("  database:", url.pathname.slice(1));

const client = new Client({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  user: url.username,
  password: password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected to Supabase successfully.");

const sql = `
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  year_built INTEGER,
  epc_rating TEXT,
  council_tax_band TEXT,
  purchase_price NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2) NOT NULL,
  monthly_rent NUMERIC(10,2) NOT NULL,
  monthly_mortgage NUMERIC(10,2) NOT NULL,
  monthly_expenses NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'vacant',
  purchase_date TEXT NOT NULL,
  mortgage_lender TEXT,
  mortgage_rate NUMERIC(5,2),
  mortgage_type TEXT,
  mortgage_term_years INTEGER,
  mortgage_fix_end_date TEXT,
  mortgage_balance NUMERIC(12,2),
  photo_url TEXT,
  rightmove_url TEXT,
  zoopla_url TEXT,
  land_registry_url TEXT,
  letting_agent TEXT,
  letting_agent_phone TEXT,
  letting_agent_email TEXT,
  letting_agent_fee NUMERIC(5,2),
  solicitor TEXT,
  solicitor_phone TEXT,
  insurance_provider TEXT,
  insurance_renewal_date TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  property_id INTEGER NOT NULL,
  lease_start TEXT NOT NULL,
  lease_end TEXT NOT NULL,
  monthly_rent NUMERIC(10,2) NOT NULL,
  deposit_paid NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  partner_first_name TEXT,
  partner_last_name TEXT,
  partner_email TEXT,
  partner_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  estimated_cost NUMERIC(10,2) NOT NULL,
  actual_cost NUMERIC(10,2),
  reported_date TEXT NOT NULL,
  completed_date TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS refurb_projects (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  budget NUMERIC(10,2) NOT NULL,
  actual_cost NUMERIC(10,2),
  start_date TEXT NOT NULL,
  end_date TEXT,
  contractor TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS property_valuations (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  valuation_date TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS rent_payments (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  tenant_id INTEGER,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  amount_due NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS rent_charges (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  tenant_id INTEGER,
  charge_date TEXT NOT NULL,
  charge_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date TEXT,
  deducted_from_deposit BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  tenant_id INTEGER,
  amount NUMERIC(10,2) NOT NULL,
  received_date TEXT NOT NULL,
  scheme TEXT NOT NULL DEFAULT 'DPS',
  scheme_reference TEXT,
  registered_date TEXT,
  status TEXT NOT NULL DEFAULT 'held',
  returned_amount NUMERIC(10,2),
  returned_date TEXT,
  deductions NUMERIC(10,2),
  deduction_notes TEXT,
  prescribed_info_sent BOOLEAN NOT NULL DEFAULT false,
  prescribed_info_date TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tradespeople (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  trade_type TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  rightmove_url TEXT,
  address TEXT NOT NULL DEFAULT '',
  asking_price NUMERIC(12,2),
  property_type TEXT,
  bedrooms INTEGER,
  status TEXT NOT NULL DEFAULT 'criteria_check',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
`;

await client.query(sql);
console.log("All tables created successfully in Supabase.");
await client.end();
