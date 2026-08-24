import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCanada() {
  const { data: canada, error } = await supabase
    .from('countries')
    .select('*')
    .ilike('name', 'Canada')
    .single();

  console.log('Canada Entity:', canada, 'Error:', error);
}

findCanada();
