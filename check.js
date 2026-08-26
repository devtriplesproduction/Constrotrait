const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wbsgbohrwsgmrymyprib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic2dib2hyd3NnbXJ5bXlwcmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzExNjg0NywiZXhwIjoyMTAyNjkyODQ3fQ.hfGVYL2PkHUPLcBqkbkfXvgA8BpIgOr7PVGIjevs0VI'
);

async function check() {
  const { data: pdata, error: perror } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, branch_id, department, roles');
    
  console.log('PROFILES:', pdata);

  const { data: ndata, error: nerror } = await supabase
    .from('notifications')
    .select('*');
    
  console.log('NOTIFICATIONS:', ndata);
  
  const { data: hdata, error: herror } = await supabase
    .from('holidays')
    .select('*');
    
  console.log('HOLIDAYS:', hdata);
}
check();
