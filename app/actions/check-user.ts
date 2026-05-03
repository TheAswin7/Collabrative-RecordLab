'use server';

import { createClient } from '@supabase/supabase-js';

export async function checkUserExists(email: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return false; // Fail safe
  }

  const userExists = data.users.some(user => user.email === email);
  return userExists;
}
