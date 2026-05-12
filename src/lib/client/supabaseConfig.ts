const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  isHttpUrl(supabaseUrl) &&
    supabaseAnonKey &&
    supabaseAnonKey !== "your_supabase_anon_key" &&
    supabaseUrl !== "your_supabase_project_url"
);

export const configuredSupabaseUrl = isSupabaseConfigured ? supabaseUrl! : "https://example.supabase.co";
export const configuredSupabaseAnonKey = isSupabaseConfigured ? supabaseAnonKey! : "missing-anon-key";
