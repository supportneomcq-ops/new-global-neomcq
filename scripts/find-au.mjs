import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAustralia() {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .or('name.ilike.%Australia%,iso2.eq.AU,iso3.eq.AUS');

  console.log('Australia search:', data, error);
}

findAustralia();
