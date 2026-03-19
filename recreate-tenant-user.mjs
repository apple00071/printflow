import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTenantUser() {
  const email = 'applegraphicshyd@gmail.com';
  const password = 'Sulochana5%';
  const tenantId = 'e8c89ad3-11b0-43fa-97b2-706ab1a78e50';

  console.log(`Creating user ${email}...`);

  // 1. Create Auth User
  const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'ADMIN' }
  });

  if (authError) {
    if (authError.message.includes('already exists')) {
       console.log("User already exists in Auth.");
    } else {
       throw authError;
    }
  }

  const userId = user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id;

  if (!userId) throw new Error("Could not get user ID");

  // 2. Create Profile
  console.log(`Creating profile for User ID: ${userId}...`);
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: 'ADMIN',
      tenant_id: tenantId,
      name: 'Apple Admin',
      username: 'appleadmin',
      updated_at: new Date().toISOString()
    });

  if (profileError) throw profileError;

  console.log("Tenant user successfully created and linked!");
}

createTenantUser().catch(console.error);
