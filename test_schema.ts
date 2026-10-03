
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://nxvghafschdniemrpqkn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dmdoYWZzY2hkbmllbXJwcWtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc1ODQ0NiwiZXhwIjoyMTA0MzM0NDQ2fQ.8-4neq-nBacMme2XDOZGLTPNwI6EXDj1s8iNwYeWNsI";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from("job_entries").select("*").limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Columns:", Object.keys(data[0] || {}));
  }
}
check();
