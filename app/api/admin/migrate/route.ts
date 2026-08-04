import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

export async function POST() {
  const postgresUrl = process.env.POSTGRES_URL || "postgres://postgres.exzpqrqflfhawgtnzxqx:g5vkvUL3aUJJe8cM@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
  const connectionString = postgresUrl.split('?')[0];

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const sqlPath = path.join(process.cwd(), 'supabase_complete_migration.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sqlContent);
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Supabase database migration executed successfully! All tables, RLS policies, triggers and seeds are live.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
