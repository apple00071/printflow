import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTenantUser() {
  const email = 'applegraphicshyd@gmail.com';
  const newPassword = 'Sulochana5%';
  const tenantId = 'e8c89ad3-11b0-43fa-97b2-706ab1a78e50';

  console.log(`Checking user ${email}...`);

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = users.find(u => u.email === email);

  let userId;

  if (!user) {
    console.log("User does not exist. Creating...");
    const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });
    if (createError) throw createError;
    userId = newUser.id;
  } else {
    console.log(`User exists (ID: ${user.id}). Updating password...`);
    userId = user.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    if (updateError) throw updateError;
  }

  console.log(`Ensuring profile exists for ID: ${userId}...`);
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

  console.log("Tenant user successfully synced with password Sulochana5%!");
}

syncTenantUser().catch(console.error);
