const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTenant() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', 'apple-graphics-1773903883169')
    .single();

  if (error) {
    console.error('Error fetching tenant:', error.message);
    process.exit(1);
  }

  console.log('Tenant found:', JSON.stringify(data, null, 2));
}

checkTenant();
