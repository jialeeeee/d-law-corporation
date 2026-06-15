// Supabase browser client (for client components / forms).
// Uses the PUBLIC anon key — this one is SAFE in the browser (unlike AGNES_KEY
// or DATABASE_URL). Access to data is still gated by auth + app-level checks.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
