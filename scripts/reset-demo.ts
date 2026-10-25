import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const envFlag = process.argv.indexOf("--env");
config({ path: envFlag > -1 ? process.argv[envFlag + 1] : ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

supabase.rpc("reset_demo_data").then(({ data, error }) => {
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(data);
});
