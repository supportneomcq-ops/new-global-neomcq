import pg from 'pg';
const { Client } = pg;

async function run() {
  const rawUrl = process.env.POSTGRES_URL;
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = [
    "ai_jobs",
    "ai_cost_events",
    "ai_cost_alerts",
    "ai_margin_rules",
    "ai_model_pricing",
    "ai_task_routing",
    "credit_accounts",
    "credit_ledger",
    "credit_packs",
    "plan_ai_limits",
    "audit_logs",
    "profiles",
    "subscription_plans",
    "subscriptions",
    "payments",
    "content_versions"
  ];

  for (const t of tables) {
    const cols = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\n=== Table: ${t} ===`);
    cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (null: ${c.is_nullable}, def: ${c.column_default})`));
  }

  await client.end();
}

run().catch(console.error);
