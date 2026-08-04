import fs from 'fs';
import path from 'path';
import pg from 'pg';

const rawUrl = process.env.POSTGRES_URL || "postgres://postgres.exzpqrqflfhawgtnzxqx:g5vkvUL3aUJJe8cM@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";

// Clean SSL mode from string for custom pg SSL config
const connectionString = rawUrl.split('?')[0];

async function runMigration() {
  console.log("Connecting to Supabase PostgreSQL Database...");
  const client = new pg.Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase PostgreSQL!");

    const sqlPath = path.join(process.cwd(), 'supabase_complete_migration.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing complete database migration script...");
    await client.query(sqlContent);
    console.log("=================================================");
    console.log("MIGRATION SUCCESSFUL! All tables, triggers, policies, and seeds created in Supabase.");
    console.log("=================================================");
  } catch (err) {
    console.error("Migration error:", err.message || err);
  } finally {
    await client.end();
  }
}

runMigration();
