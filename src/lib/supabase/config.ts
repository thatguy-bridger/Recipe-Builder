// The anon/publishable key is designed to be public and safe for client bundles;
// it only grants what row-level security policies allow.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pfobqnctixdpdzzrtriu.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_umxKO6i22PagOYmJ0B6aSA_EvgRsuGV";
