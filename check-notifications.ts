import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkNotifications() {
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*, profiles!notifications_user_id_fkey(first_name, last_name, department, roles)')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(notifications, null, 2));
  }
}

checkNotifications();
