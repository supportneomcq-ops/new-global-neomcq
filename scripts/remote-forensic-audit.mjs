import pg from 'pg';

const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'exzpqrqflfhawgtnzxqx';

if (!rawUrl) {
  console.error('Missing POSTGRES_URL');
  process.exit(1);
}

// Clean connection string for pg driver
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false }
});

async function runAudit() {
  await client.connect();
  console.log('--- CONNECTED TO REMOTE POSTGRES DATABASE ---');

  // 1. Tables
  const tablesRes = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'storage') AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name;
  `);
  console.log('\n=== TABLES (' + tablesRes.rows.length + ') ===');
  console.table(tablesRes.rows);

  // 2. Views
  const viewsRes = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'storage') AND table_type = 'VIEW'
    ORDER BY table_schema, table_name;
  `);
  console.log('\n=== VIEWS (' + viewsRes.rows.length + ') ===');
  console.table(viewsRes.rows);

  // 3. Functions / RPCs
  const funcsRes = await client.query(`
    SELECT 
      n.nspname as schema,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      l.lanname as language,
      p.prosecdef as is_security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `);
  console.log('\n=== FUNCTIONS / RPCs (' + funcsRes.rows.length + ') ===');
  console.table(funcsRes.rows);

  // 4. Triggers
  const triggersRes = await client.query(`
    SELECT 
      event_object_table as table_name,
      trigger_name,
      event_manipulation as event,
      action_statement as action,
      action_timing as timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);
  console.log('\n=== TRIGGERS (' + triggersRes.rows.length + ') ===');
  console.table(triggersRes.rows);

  // 5. RLS Policies
  const rlsRes = await client.query(`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  console.log('\n=== RLS POLICIES (' + rlsRes.rows.length + ') ===');
  console.table(rlsRes.rows);

  // 6. RLS Enabled Status on Tables
  const rlsStatusRes = await client.query(`
    SELECT 
      schemaname,
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log('\n=== RLS ENABLED STATUS (' + rlsStatusRes.rows.length + ') ===');
  console.table(rlsStatusRes.rows);

  // 7. Enums
  const enumsRes = await client.query(`
    SELECT t.typname as enum_name, e.enumlabel as enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log('\n=== ENUMS (' + enumsRes.rows.length + ') ===');
  console.table(enumsRes.rows);

  // 8. Extensions
  const extRes = await client.query(`
    SELECT extname, extversion FROM pg_extension ORDER BY extname;
  `);
  console.log('\n=== EXTENSIONS (' + extRes.rows.length + ') ===');
  console.table(extRes.rows);

  // 9. Storage Buckets
  try {
    const bucketsRes = await client.query(`
      SELECT id, name, public, created_at FROM storage.buckets;
    `);
    console.log('\n=== STORAGE BUCKETS ===');
    console.table(bucketsRes.rows);
  } catch (err) {
    console.log('\n=== STORAGE BUCKETS: Error querying storage.buckets:', err.message);
  }

  // 10. Realtime Publications
  try {
    const pubRes = await client.query(`
      SELECT pubname, schemaname, tablename 
      FROM pg_publication_tables 
      ORDER BY pubname, tablename;
    `);
    console.log('\n=== REALTIME PUBLICATIONS ===');
    console.table(pubRes.rows);
  } catch (err) {
    console.log('\n=== REALTIME PUBLICATIONS ERROR:', err.message);
  }

  // 11. Migration history table if exists
  try {
    const migRes = await client.query(`
      SELECT version, name, inserted_at FROM supabase_migrations.schema_migrations ORDER BY version;
    `);
    console.log('\n=== REMOTE SUPABASE MIGRATIONS ===');
    console.table(migRes.rows);
  } catch (err) {
    console.log('\n=== REMOTE MIGRATIONS TABLE: ', err.message);
  }

  await client.end();

  // 12. Supabase Management API: Edge Functions & Secrets
  console.log('\n=== DEPLOYED EDGE FUNCTIONS (via Management API) ===');
  if (supabaseToken) {
    try {
      const fnRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions`, {
        headers: { Authorization: `Bearer ${supabaseToken}` }
      });
      const functions = await fnRes.json();
      console.log('Deployed Edge Functions count:', Array.isArray(functions) ? functions.length : functions);
      if (Array.isArray(functions)) {
        console.table(functions.map(f => ({
          id: f.id,
          slug: f.slug,
          name: f.name,
          status: f.status,
          version: f.version,
          created_at: f.created_at,
          updated_at: f.updated_at
        })));
      } else {
        console.log('Response:', functions);
      }

      console.log('\n=== CONFIGURABLE SECRETS (via Management API) ===');
      const secRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
        headers: { Authorization: `Bearer ${supabaseToken}` }
      });
      const secrets = await secRes.json();
      if (Array.isArray(secrets)) {
        console.table(secrets.map(s => ({ name: s.name, value: '***HIDDEN***' })));
      } else {
        console.log('Response:', secrets);
      }
    } catch (err) {
      console.error('Error fetching Edge Functions / Secrets:', err.message);
    }
  } else {
    console.log('SUPABASE_ACCESS_TOKEN not set');
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
