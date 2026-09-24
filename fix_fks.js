require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const password = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'nxvghafschdniemrpqkn';
const dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE public.team_members DROP CONSTRAINT team_members_employee_id_fkey;
      ALTER TABLE public.team_members ADD CONSTRAINT team_members_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      
      ALTER TABLE public.job_assignments DROP CONSTRAINT job_assignments_assigned_to_fkey;
      ALTER TABLE public.job_assignments ADD CONSTRAINT job_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
      
      ALTER TABLE public.job_assignments DROP CONSTRAINT job_assignments_assigned_by_fkey;
      ALTER TABLE public.job_assignments ADD CONSTRAINT job_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
      
      NOTIFY pgrst, 'reload schema';
    `);
    console.log('Successfully updated foreign keys and reloaded schema cache.');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
