import { createBrowserClient } from "@supabase/ssr";
import { configuredSupabaseAnonKey, configuredSupabaseUrl, isSupabaseConfigured } from "./supabaseConfig";

export const supabase = createBrowserClient(
  configuredSupabaseUrl,
  configuredSupabaseAnonKey
);

export { isSupabaseConfigured };
