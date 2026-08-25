import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAppMetadata() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of users) {
    const meta = user.app_metadata || {};
    let needsUpdate = false;
    
    // If user has old string 'role' and no 'roles' array
    if (meta.role && !meta.roles) {
      meta.roles = [meta.role];
      delete meta.role;
      needsUpdate = true;
    } 
    // Or if 'roles' is somehow missing entirely but we want to default it
    else if (!meta.roles) {
      // Find role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();
        
      if (profile && profile.roles) {
        meta.roles = profile.roles;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log(`Updating app_metadata for ${user.email} (id: ${user.id}). New metadata:`, meta);
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: meta
      });
      if (updateError) {
        console.error(`Failed to update user ${user.email}:`, updateError);
      } else {
        console.log(`Successfully updated ${user.email}`);
      }
    } else {
      console.log(`User ${user.email} already up to date.`);
    }
  }
}

fixAppMetadata();
