import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const postgresUrl = process.env.POSTGRES_URL;
    if (!postgresUrl) {
      return NextResponse.json({ error: 'POSTGRES_URL environment variable is not configured.' }, { status: 500 });
    }

    const connectionString = postgresUrl.split('?')[0];

    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

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
      { success: false, error: 'Migration failed. Please check server logs.' },
      { status: 500 }
    );
  }
}

