import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/server/env";

export function createRouteSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handlers can set cookies; server components cannot. This helper is used by routes.
        }
      }
    }
  });
}

export async function getAuthenticatedUser() {
  const supabase = createRouteSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) return { supabase, user: null, error };
  return { supabase, user, error: null };
}

export async function requireAdmin() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (error || !user) {
    return { supabase, user: null, admin: null, error: "UNAUTHORIZED" as const };
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !adminUser) {
    return { supabase, user, admin: null, error: "FORBIDDEN" as const };
  }

  return { supabase, user, admin: adminUser, error: null };
}

export async function requireOrgUser() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (error || !user) {
    return { supabase, user: null, org: null, error: "UNAUTHORIZED" as const };
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .limit(1)
    .maybeSingle();

  if (orgError) {
    return { supabase, user, org: null, error: "SERVER_ERROR" as const };
  }

  if (!org) {
    return { supabase, user, org: null, error: "ORG_REQUIRED" as const };
  }

  return { supabase, user: user as User, org, error: null };
}
